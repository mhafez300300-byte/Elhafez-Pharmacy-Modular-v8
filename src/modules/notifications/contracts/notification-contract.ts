export type NotificationSeverity='info'|'warning'|'danger';
export type NotificationView=Readonly<{id:string;title:string;body:string;severity:NotificationSeverity;link:string|null;readAt:string|null;resolvedAt:string|null;createdAt:string}>;
export interface NotificationContract{
  list(tenantId:string,userId:string,limit?:number):Promise<NotificationView[]>;
  unreadCount(tenantId:string,userId:string):Promise<number>;
  markRead(tenantId:string,userId:string,id:string):Promise<void>;
  upsertAlert(input:{tenantId:string;dedupeKey:string;title:string;body:string;severity:NotificationSeverity;link?:string|null}):Promise<void>;
  resolveAlert(tenantId:string,dedupeKey:string):Promise<void>;
  purgeResolved(days:number):Promise<number>;
}
