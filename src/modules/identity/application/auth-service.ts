import { createHash, randomUUID } from 'node:crypto';
import { AppError } from '../../../core/errors/app-error.js';
import { issueSignedToken } from '../../../core/security/token.js';
import type { IdentityContract } from '../contracts/identity-contract.js';
import { LOGIN_BLOCK_MINUTES,LOGIN_MAX_FAILURES,LOGIN_WINDOW_MINUTES,loginIsBlocked } from '../domain/login-policy.js';

const loginKey=(username:string)=>createHash('sha256').update(username.trim().toLowerCase()).digest('hex');
export class AuthService {
  constructor(private readonly identity: IdentityContract, private readonly appSecret: string, private readonly sessionHours: number) {}
  async login(username: string, pin: string,clientLabel?:string) {
    const key=loginKey(username),guard=await this.identity.getLoginGuard(key);
    if(loginIsBlocked(guard.blockedUntil))throw new AppError('LOGIN_RATE_LIMITED','تم إيقاف محاولات الدخول مؤقتًا بسبب محاولات فاشلة متكررة',429,{retryAt:guard.blockedUntil});
    const user=await this.identity.authenticate(username,pin);
    if(!user){const next=await this.identity.recordLoginFailure(key,LOGIN_MAX_FAILURES,LOGIN_BLOCK_MINUTES,LOGIN_WINDOW_MINUTES);if(loginIsBlocked(next.blockedUntil))throw new AppError('LOGIN_RATE_LIMITED','تم إيقاف محاولات الدخول مؤقتًا بسبب محاولات فاشلة متكررة',429,{retryAt:next.blockedUntil});throw new AppError('LOGIN_INVALID','بيانات الدخول غير صحيحة',401);}
    await this.identity.clearLoginFailures(key);
    const sid=randomUUID(),expiresAt=new Date(Date.now()+this.sessionHours*3600_000).toISOString();
    await this.identity.createSession({id:sid,tenantId:user.tenantId,userId:user.id,expiresAt,clientLabel:clientLabel?.slice(0,160)||null});
    const token=issueSignedToken({sid,uid:user.id,tenantId:user.tenantId,exp:new Date(expiresAt).getTime()},this.appSecret);
    return {user,token,expiresAt,maxAgeMs:this.sessionHours*3600_000};
  }
  async logout(tenantId:string,userId:string,sessionId:string){await this.identity.revokeSession(tenantId,userId,sessionId);}
}
