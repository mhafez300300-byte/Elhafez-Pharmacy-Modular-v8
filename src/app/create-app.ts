'use strict';
const path=require('path');
const {logger}=require('../core/logging/logger');

export function createApp({express,composition,rootDir}:any){
 const app=express();
 if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 app.disable('x-powered-by');
 app.use(express.json({limit:'6mb'}));
 app.use((req:any,res:any,next:any)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; font-src 'self' data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
  if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
 });
 const services=composition.services;
 app.use((req:any,res:any,next:any)=>services.originOkay(req)?next():res.status(403).json({error:'Origin rejected'}));
 app.use(services.authOptional);
 composition.registerRoutes(app);
 app.use(express.static(path.join(rootDir,'public'),{
  etag:true,maxAge:process.env.NODE_ENV==='production'?'1h':0,
  setHeaders(res:any,filePath:string){const name=path.basename(filePath);if(name==='sw.js'||/\.(?:html|js|css|webmanifest)$/i.test(name))res.setHeader('Cache-Control','no-cache, must-revalidate');else if(/\.(png|jpg|jpeg|webp|svg|ico)$/i.test(name))res.setHeader('Cache-Control','public, max-age=604800, immutable')}
 }));
 app.use((req:any,res:any,next:any)=>{if(req.method==='GET'&&!req.path.startsWith('/api/')&&req.accepts('html'))return res.sendFile(path.join(rootDir,'public/index.html'));next()});
 app.use((err:any,req:any,res:any,next:any)=>{
  logger.error('request_failed',{method:req.method,path:req.path,code:err.code||err.message,status:err.status||500});
  const status=err.status||500;
  res.status(status).json({error:err.code||err.message||'SERVER_ERROR',currentRevision:err.currentRevision,details:err.details});
 });
 return app;
}
