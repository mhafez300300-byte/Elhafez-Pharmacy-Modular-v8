export interface Logger { info(message:string, meta?:any):void; warn(message:string, meta?:any):void; error(message:string, meta?:any):void; }
export const logger: Logger = {
  info(message,meta){ console.log(message, meta ?? ''); },
  warn(message,meta){ console.warn(message, meta ?? ''); },
  error(message,meta){ console.error(message, meta ?? ''); }
};
