declare const require: any;
declare const module: any;
declare const process: any;
declare const __dirname: string;
declare const Buffer: any;
declare namespace NodeJS { interface Timeout { unref(): void } }

declare module 'express' { const value: any; export = value; }
declare module 'pg' { export const Pool: any; }
declare module 'fs' { const value: any; export = value; }
declare module 'path' { const value: any; export = value; }
declare module 'crypto' { const value: any; export = value; }
declare module 'os' { const value: any; export = value; }
declare module 'child_process' { export const execFile: any; export const execFileSync: any; }
declare module 'util' { export const promisify: any; }
declare module 'node:test' { const value: any; export = value; }
declare module 'node:assert/strict' { const value: any; export = value; }
declare function setTimeout(handler: (...args:any[])=>void, timeout?: number, ...args:any[]): any;
declare function setInterval(handler: (...args:any[])=>void, timeout?: number, ...args:any[]): any;
declare function clearTimeout(handle:any): void;
declare function fetch(input:any, init?:any): Promise<any>;
declare const console: { log(...args:any[]):void; warn(...args:any[]):void; error(...args:any[]):void; };
declare class URL { constructor(input:string, base?:string); origin:string; pathname:string; searchParams:any; }
declare class AbortSignal { static timeout(ms:number): AbortSignal; }
interface URL { host:string; protocol:string; href:string; }
