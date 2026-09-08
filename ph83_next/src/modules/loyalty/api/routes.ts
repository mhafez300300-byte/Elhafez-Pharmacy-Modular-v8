import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import type { LoyaltyContract } from '../contracts/loyalty-contract.js';

export const loyaltyRoutes=(loyalty:LoyaltyContract)=>{
  const r=Router();r.use(requireAuth);
  r.get('/rules/current',requirePermission('loyalty.read'),asyncHandler(async(req,res)=>res.json({rule:await loyalty.getRule(req.auth!.tenantId)})));
  r.put('/rules/current',requirePermission('loyalty.manage'),asyncHandler(async(req,res)=>res.json({rule:await loyalty.saveRule({tenantId:req.auth!.tenantId,enabled:req.body?.enabled!==false,earnPointsPerCurrency:Number(req.body?.earnPointsPerCurrency??1),pointValue:Number(req.body?.pointValue??0.01),minRedeemPoints:Number(req.body?.minRedeemPoints??100),maxRedeemPercent:Number(req.body?.maxRedeemPercent??20)})})));
  r.get('/:customerId/quote',requirePermission('loyalty.read'),asyncHandler(async(req,res)=>res.json({quote:await loyalty.quoteRedemption({tenantId:req.auth!.tenantId,customerId:req.params.customerId,requestedPoints:Number(req.query.points??0),saleAmount:Number(req.query.amount??0)})})));
  r.get('/:customerId',requirePermission('loyalty.read'),asyncHandler(async(req,res)=>res.json({account:await loyalty.get(req.auth!.tenantId,req.params.customerId),rule:await loyalty.getRule(req.auth!.tenantId),history:await loyalty.history(req.auth!.tenantId,req.params.customerId,Number(req.query.limit??100))})));
  return r;
};
