export class ApiError extends Error{constructor(public readonly code:string,message:string,public readonly status:number){super(message)}}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers??{})},credentials:'same-origin'});if(response.status===204)return undefined as T;const body=await response.json().catch(()=>({}));if(!response.ok)throw new ApiError(body.error??'REQUEST_FAILED',body.message??'تعذر إتمام العملية',response.status);return body as T;}
export const post=<T>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
export const put=<T>(path:string,body:unknown)=>api<T>(path,{method:'PUT',body:JSON.stringify(body)});
