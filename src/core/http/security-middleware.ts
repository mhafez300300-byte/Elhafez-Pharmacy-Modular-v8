import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const securityHeaders:RequestHandler=(_req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; font-src 'self' data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
  if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
};

const unsafe=new Set(['POST','PUT','PATCH','DELETE']);
export const sameOriginWriteGuard:RequestHandler=(req,_res,next)=>{
  if(!unsafe.has(req.method))return next();
  const origin=req.headers.origin;if(!origin)return next();
  try{const parsed=new URL(String(origin)),host=String(req.headers.host??'');if(parsed.host!==host)throw new Error('host');return next();}
  catch{return next(new AppError('ORIGIN_REJECTED','تم رفض مصدر الطلب للحماية من الطلبات غير الموثوقة',403));}
};
