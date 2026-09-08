import test from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders, sameOriginWriteGuard } from '../src/core/http/security-middleware.js';
import { AppError } from '../src/core/errors/app-error.js';

function responseRecorder(){
  const headers=new Map<string,string>();
  return {headers,setHeader:(k:string,v:string)=>headers.set(k,v)};
}

test('security headers apply browser hardening policies',()=>{
  const res=responseRecorder();let nextCalls=0;
  securityHeaders({} as any,res as any,()=>{nextCalls++;});
  assert.equal(nextCalls,1);
  assert.equal(res.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(res.headers.get('X-Frame-Options'),'SAMEORIGIN');
  assert.match(res.headers.get('Content-Security-Policy')??'',/frame-ancestors 'self'/);
  assert.match(res.headers.get('Permissions-Policy')??'',/microphone=\(\)/);
});

test('same-origin guard rejects foreign origins on writes',()=>{
  let captured:unknown;
  sameOriginWriteGuard({method:'POST',headers:{origin:'https://evil.example',host:'pharmacy.example'}} as any,{} as any,(err?:unknown)=>{captured=err;});
  assert.ok(captured instanceof AppError);
  assert.equal((captured as AppError).code,'ORIGIN_REJECTED');
  assert.equal((captured as AppError).status,403);
});

test('same-origin guard accepts same host and safe reads',()=>{
  let postOk=false,getOk=false;
  sameOriginWriteGuard({method:'POST',headers:{origin:'https://pharmacy.example',host:'pharmacy.example'}} as any,{} as any,(err?:unknown)=>{assert.equal(err,undefined);postOk=true;});
  sameOriginWriteGuard({method:'GET',headers:{origin:'https://evil.example',host:'pharmacy.example'}} as any,{} as any,(err?:unknown)=>{assert.equal(err,undefined);getOk=true;});
  assert.equal(postOk,true);assert.equal(getOk,true);
});
