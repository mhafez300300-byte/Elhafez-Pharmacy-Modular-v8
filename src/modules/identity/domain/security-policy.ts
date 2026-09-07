'use strict';

const PRIVILEGED_ACTORS=new Set(['owner','admin']);
const ELEVATED_ROLES=new Set(['owner','admin','manager']);
const ADMIN_ACTIONS=['allowBackupRestore','allowSecuritySettings','allowPeriodReopen'];

function roleKey(v:any){return String(v?.roleKey??v?.role_key??v??'').trim().toLowerCase()}
function isPrivilegedActor(user:any){return PRIVILEGED_ACTORS.has(roleKey(user))}
function isElevatedRole(v:any){return ELEVATED_ROLES.has(roleKey(v))}
function assertUserGrant(actor:any,existing:any,requested:any,{firstOwner=false}:any={}){
 if(firstOwner)return true;
 const actorPrivileged=isPrivilegedActor(actor),oldRole=roleKey(existing),newRole=roleKey(requested)||oldRole,perms=Array.isArray(requested?.permissions)?requested.permissions:(existing?.permissions||[]);
 if(!actorPrivileged&&(isElevatedRole(oldRole)||isElevatedRole(newRole)||perms.includes('*'))){const e:any=new Error('PRIVILEGED_USER_MANAGEMENT_REQUIRED');e.status=403;throw e}
 if(!actorPrivileged){for(const k of ADMIN_ACTIONS){const before=!!(existing?.[camelToSnake(k)]??existing?.[k]),after=requested?.[k];if(after===true&&!before){const e:any=new Error('PRIVILEGED_ACTION_GRANT_REQUIRED');e.status=403;e.action=k;throw e}}}
 return true;
}
function camelToSnake(s:any){return String(s).replace(/[A-Z]/g,m=>'_'+m.toLowerCase())}
module.exports={PRIVILEGED_ACTORS,ELEVATED_ROLES,ADMIN_ACTIONS,roleKey,isPrivilegedActor,isElevatedRole,assertUserGrant};

export {};
