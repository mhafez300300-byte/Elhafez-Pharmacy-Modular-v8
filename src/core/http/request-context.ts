import type { RequestHandler } from 'express';
import { readSignedToken } from '../security/token.js';

export type AuthContext = Readonly<{ userId: string; tenantId: string; sessionId:string; role?: string; permissions?: readonly string[]; maxDiscountPercent?: number }>;

declare global { namespace Express { interface Request { auth?: AuthContext } } }
function cookieValue(raw:string|undefined,name:string):string|undefined{if(!raw)return undefined;for(const part of raw.split(';')){const[key,...value]=part.trim().split('=');if(key===name)return decodeURIComponent(value.join('='));}return undefined;}
export function authContext(appSecret:string):RequestHandler{return(req,_res,next)=>{const bearer=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined;const token=bearer??cookieValue(req.headers.cookie,'elhafez_session');if(token){const claims=readSignedToken(token,appSecret);if(claims)req.auth={userId:claims.uid,tenantId:claims.tenantId,sessionId:claims.sid};}next();};}
