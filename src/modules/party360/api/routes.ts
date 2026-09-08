import { Router } from 'express';
import { requireAuth } from '../../../core/http/require-auth.js';
import { requirePermission } from '../../../core/http/require-permission.js';
import { asyncHandler } from '../../../core/http/async-handler.js';
import type { Party360Service } from '../application/party360-service.js';
export const party360Routes=(service:Party360Service)=>{const r=Router();r.use(requireAuth,requirePermission('settlements.read'));r.get('/customers/:id',asyncHandler(async(req,res)=>res.json(await service.customer(req.auth!.tenantId,String(req.params.id)))));r.get('/suppliers/:id',asyncHandler(async(req,res)=>res.json(await service.supplier(req.auth!.tenantId,String(req.params.id)))));return r;};
