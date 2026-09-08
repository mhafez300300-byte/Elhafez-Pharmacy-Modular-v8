import type { DbTx } from '../../../core/db/types.js';

export type UserView = Readonly<{
  id: string;
  tenantId: string;
  name: string;
  username: string;
  role: string;
  permissions: readonly string[];
  maxDiscountPercent: number;
  active: boolean;
}>;

export type SessionView = Readonly<{
  id: string;
  tenantId: string;
  userId: string;
  clientLabel: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
}>;

export type LoginGuardView = Readonly<{
  failures: number;
  blockedUntil: string | null;
}>;

export interface IdentityContract {
  createOwner(input: { id: string; tenantId: string; name: string; username: string; pin: string }, tx: DbTx): Promise<UserView>;
  createUser(input: { id: string; tenantId: string; name: string; username: string; pin: string; role: string; permissions: readonly string[]; maxDiscountPercent: number }, tx?: DbTx): Promise<UserView>;
  authenticate(usernameOrId: string, pin: string): Promise<UserView | null>;
  findUser(tenantId: string, userId: string): Promise<UserView | null>;
  listUsers(tenantId: string): Promise<UserView[]>;
  getLoginGuard(loginKey: string): Promise<LoginGuardView>;
  recordLoginFailure(loginKey: string, maxFailures: number, blockMinutes: number, windowMinutes: number): Promise<LoginGuardView>;
  clearLoginFailures(loginKey: string): Promise<void>;
  createSession(input:{id:string;tenantId:string;userId:string;expiresAt:string;clientLabel?:string|null}):Promise<SessionView>;
  validateSession(tenantId:string,userId:string,sessionId:string):Promise<boolean>;
  touchSession(tenantId:string,userId:string,sessionId:string):Promise<void>;
  listSessions(tenantId:string,userId:string):Promise<SessionView[]>;
  revokeSession(tenantId:string,userId:string,sessionId:string):Promise<void>;
  revokeOtherSessions(tenantId:string,userId:string,keepSessionId:string):Promise<number>;
  revokeAllSessions(tenantId:string,userId:string):Promise<number>;
  changePin(tenantId:string,userId:string,currentPin:string,newPin:string):Promise<void>;
  purgeSecurityState():Promise<{sessions:number;attempts:number}>;
}
