import type { UnitOfWork } from '../../../core/db/unit-of-work.js';
import type { CashContract } from '../contracts/cash-contract.js';
import type { AuditContract } from '../../audit/contracts/audit-contract.js';

export class CashService{
  constructor(private readonly uow:UnitOfWork,private readonly cash:CashContract,private readonly audit:AuditContract){}
  async openShift(input:{id:string;tenantId:string;branchId:string;userId:string;openingCash:number}){
    return this.uow.withTransaction(async tx=>{
      const shift=await this.cash.openShift(input,tx);
      await this.audit.record({tenantId:input.tenantId,userId:input.userId,action:'shift.opened',entity:'cash_shift',entityId:shift.id,detail:{branchId:shift.branchId,openingCash:shift.openingCash,status:shift.status}},tx);
      return shift;
    });
  }
  async closeShift(input:{tenantId:string;userId:string;shiftId:string;closingCash:number}){
    return this.uow.withTransaction(async tx=>{
      const before=await this.cash.getShift(input.tenantId,input.shiftId,tx);
      const shift=await this.cash.closeShift({tenantId:input.tenantId,shiftId:input.shiftId,closingCash:input.closingCash},tx);
      await this.audit.record({tenantId:input.tenantId,userId:input.userId,action:'shift.closed',entity:'cash_shift',entityId:shift.id,detail:{branchId:shift.branchId,openingCash:shift.openingCash,closingCash:shift.closingCash,expectedCash:shift.expectedCash,variance:shift.variance,previousStatus:before?.status??'open',status:shift.status}},tx);
      return shift;
    });
  }
}
