export type User={id:string;tenantId:string;name:string;username:string;role:string;permissions:string[];maxDiscountPercent:number;active:boolean};export type Branch={id:string;tenantId:string;name:string;active:boolean};
export const state:{user:User|null;branch:Branch|null;page:string;sidebar:boolean}={user:null,branch:null,page:'dashboard',sidebar:false};
