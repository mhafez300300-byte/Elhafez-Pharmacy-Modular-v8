declare const process: any;
declare const Buffer: any;

declare module 'node:crypto' {
  export function randomBytes(size:number): any;
  export function scryptSync(secret:string,salt:string,keylen:number): any;
  export function timingSafeEqual(a:any,b:any): boolean;
  export function createHmac(algorithm:string,key:string): any;
  export function createHash(algorithm:string): any;
  export function createCipheriv(algorithm:string,key:any,iv:any): any;
  export function createDecipheriv(algorithm:string,key:any,iv:any): any;
  export function randomUUID(): string;
}

declare module 'node:path' {
  const path: { resolve(...parts:string[]):string; join(...parts:string[]):string };
  export default path;
}

declare module 'express' {
  export type RequestHandler = (req:any,res:any,next:any)=>any;
  export type ErrorRequestHandler = (err:any,req:any,res:any,next:any)=>any;
  export interface RouterType { use(...args:any[]):any; get(...args:any[]):any; post(...args:any[]):any; put(...args:any[]):any; delete(...args:any[]):any; }
  export function Router(): RouterType;
  const express: any;
  export default express;
}

declare module 'pg' {
  export interface QueryResultRow { [key:string]: any }
  export interface QueryResult<R extends QueryResultRow=QueryResultRow> { rows:R[]; rowCount:number|null }
  export interface PoolClient { query<R extends QueryResultRow=QueryResultRow>(text:string,params?:any[]):Promise<QueryResult<R>>; release():void }
  export class Pool {
    constructor(config?:any);
    query<R extends QueryResultRow=QueryResultRow>(text:string,params?:any[]):Promise<QueryResult<R>>;
    connect():Promise<PoolClient>;
    end():Promise<void>;
  }
}

declare module 'node:test' { const test:any; export default test; }
declare module 'node:assert/strict' { const assert:any; export default assert; }
declare module 'node:fs/promises' { export const readFile:any; export const readdir:any; }
declare module 'exceljs' { export class Workbook { xlsx:any; worksheets:any[]; } }
declare module 'node:child_process' { export const execFile:any; }
declare module 'node:util' { export const promisify:any; }
declare module 'node:os' { export function tmpdir():string; }
declare module 'node:fs/promises' { export const writeFile:any; export const mkdtemp:any; export const rm:any; }

declare module 'node:zlib' { export const gunzipSync:any; export const brotliDecompressSync:any; }
