import type { DbExecutor, DbTx } from '../../../core/db/types.js';
import { AppError } from '../../../core/errors/app-error.js';
import { hashSecret, verifySecret } from '../../../core/security/password.js';
import type { IdentityContract, LoginGuardView, SessionView, UserView } from '../contracts/identity-contract.js';

type UserRow = UserView & { pinHash: string };
const projection=`id,tenant_id as "tenantId",name,username,role,permissions,max_discount_percent::float as "maxDiscountPercent",active`;
const sessionProjection=`id,tenant_id as "tenantId",user_id as "userId",client_label as "clientLabel",created_at::text as "createdAt",last_seen_at::text as "lastSeenAt",expires_at::text as "expiresAt",revoked_at::text as "revokedAt"`;
export class PostgresIdentityRepository implements IdentityContract {
  constructor(private readonly db: DbExecutor) {}
  private ex(tx?:DbTx){return tx??this.db;}
  async createOwner(input: { id: string; tenantId: string; name: string; username: string; pin: string }, tx: DbTx): Promise<UserView> {
    const q=await tx.query<UserView>(`INSERT INTO id_users(id,tenant_id,name,username,role,pin_hash,permissions,max_discount_percent,active) VALUES($1,$2,$3,$4,'owner',$5,'["*"]'::jsonb,100,true) RETURNING ${projection}`,[input.id,input.tenantId,input.name,input.username,hashSecret(input.pin)]);
    return q.rows[0]!;
  }
  async createUser(input:{id:string;tenantId:string;name:string;username:string;pin:string;role:string;permissions:readonly string[];maxDiscountPercent:number},tx?:DbTx):Promise<UserView>{
    const q=await this.ex(tx).query<UserView>(`INSERT INTO id_users(id,tenant_id,name,username,role,pin_hash,permissions,max_discount_percent,active) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,true) RETURNING ${projection}`,[input.id,input.tenantId,input.name,input.username,input.role,hashSecret(input.pin),JSON.stringify(input.permissions),input.maxDiscountPercent]);return q.rows[0]!;
  }
  async authenticate(usernameOrId: string, pin: string): Promise<UserView | null> {
    const q=await this.db.query<UserRow>(`SELECT ${projection},pin_hash as "pinHash" FROM id_users WHERE active=true AND (lower(username)=lower($1) OR id=$1) ORDER BY created_at LIMIT 2`,[usernameOrId]);
    if(q.rows.length!==1)return null;const row=q.rows[0]!;if(!verifySecret(pin,row.pinHash))return null;const{pinHash:_pinHash,...view}=row;return view;
  }
  async findUser(tenantId:string,userId:string):Promise<UserView|null>{const q=await this.db.query<UserView>(`SELECT ${projection} FROM id_users WHERE tenant_id=$1 AND id=$2`,[tenantId,userId]);return q.rows[0]??null;}
  async listUsers(tenantId:string):Promise<UserView[]>{return(await this.db.query<UserView>(`SELECT ${projection} FROM id_users WHERE tenant_id=$1 ORDER BY created_at`,[tenantId])).rows;}
  async getLoginGuard(loginKey:string):Promise<LoginGuardView>{const q=await this.db.query<LoginGuardView>(`SELECT failures,blocked_until::text as "blockedUntil" FROM id_login_attempts WHERE login_key=$1`,[loginKey]);return q.rows[0]??{failures:0,blockedUntil:null};}
  async recordLoginFailure(loginKey:string,maxFailures:number,blockMinutes:number,windowMinutes:number):Promise<LoginGuardView>{
    const q=await this.db.query<LoginGuardView>(`INSERT INTO id_login_attempts(login_key,failures,window_started_at,last_failure_at,blocked_until,updated_at) VALUES($1,1,now(),now(),NULL,now()) ON CONFLICT(login_key) DO UPDATE SET failures=CASE WHEN id_login_attempts.window_started_at<now()-($4::text||' minutes')::interval THEN 1 ELSE id_login_attempts.failures+1 END,window_started_at=CASE WHEN id_login_attempts.window_started_at<now()-($4::text||' minutes')::interval THEN now() ELSE id_login_attempts.window_started_at END,last_failure_at=now(),blocked_until=CASE WHEN id_login_attempts.blocked_until>now() THEN id_login_attempts.blocked_until WHEN (CASE WHEN id_login_attempts.window_started_at<now()-($4::text||' minutes')::interval THEN 1 ELSE id_login_attempts.failures+1 END)>=$2 THEN now()+($3::text||' minutes')::interval ELSE NULL END,updated_at=now() RETURNING failures,blocked_until::text as "blockedUntil"`,[loginKey,maxFailures,blockMinutes,windowMinutes]);return q.rows[0]!;
  }
  async clearLoginFailures(loginKey:string):Promise<void>{await this.db.query(`DELETE FROM id_login_attempts WHERE login_key=$1`,[loginKey]);}
  async createSession(input:{id:string;tenantId:string;userId:string;expiresAt:string;clientLabel?:string|null}):Promise<SessionView>{const q=await this.db.query<SessionView>(`INSERT INTO id_sessions(id,tenant_id,user_id,client_label,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING ${sessionProjection}`,[input.id,input.tenantId,input.userId,input.clientLabel??null,input.expiresAt]);return q.rows[0]!;}
  async validateSession(t:string,u:string,s:string):Promise<boolean>{return !!(await this.db.query<{ok:boolean}>(`SELECT EXISTS(SELECT 1 FROM id_sessions WHERE id=$1 AND tenant_id=$2 AND user_id=$3 AND revoked_at IS NULL AND expires_at>now()) ok`,[s,t,u])).rows[0]?.ok;}
  async touchSession(t:string,u:string,s:string):Promise<void>{await this.db.query(`UPDATE id_sessions SET last_seen_at=now() WHERE id=$1 AND tenant_id=$2 AND user_id=$3 AND revoked_at IS NULL AND last_seen_at<now()-interval '5 minutes'`,[s,t,u]);}
  async listSessions(t:string,u:string):Promise<SessionView[]>{return(await this.db.query<SessionView>(`SELECT ${sessionProjection} FROM id_sessions WHERE tenant_id=$1 AND user_id=$2 AND expires_at>now()-interval '7 days' ORDER BY created_at DESC`,[t,u])).rows;}
  async revokeSession(t:string,u:string,s:string):Promise<void>{await this.db.query(`UPDATE id_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND tenant_id=$2 AND user_id=$3`,[s,t,u]);}
  async revokeOtherSessions(t:string,u:string,keep:string):Promise<number>{const q=await this.db.query(`UPDATE id_sessions SET revoked_at=now() WHERE tenant_id=$1 AND user_id=$2 AND id<>$3 AND revoked_at IS NULL`,[t,u,keep]);return q.rowCount??0;}
  async revokeAllSessions(t:string,u:string):Promise<number>{const q=await this.db.query(`UPDATE id_sessions SET revoked_at=now() WHERE tenant_id=$1 AND user_id=$2 AND revoked_at IS NULL`,[t,u]);return q.rowCount??0;}
  async changePin(t:string,u:string,currentPin:string,newPin:string):Promise<void>{const q=await this.db.query<{pinHash:string}>(`SELECT pin_hash as "pinHash" FROM id_users WHERE tenant_id=$1 AND id=$2 AND active=true`,[t,u]);const row=q.rows[0];if(!row||!verifySecret(currentPin,row.pinHash))throw new AppError('PIN_CURRENT_INVALID','PIN الحالي غير صحيح',403);await this.db.query(`UPDATE id_users SET pin_hash=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2`,[t,u,hashSecret(newPin)]);await this.revokeAllSessions(t,u);}
  async purgeSecurityState(){const s=await this.db.query(`DELETE FROM id_sessions WHERE expires_at<now()-interval '7 days' OR revoked_at<now()-interval '7 days'`),a=await this.db.query(`DELETE FROM id_login_attempts WHERE updated_at<now()-interval '1 day' AND (blocked_until IS NULL OR blocked_until<now())`);return{sessions:s.rowCount??0,attempts:a.rowCount??0};}
}
