-- Repair accounts for tenants created after the original account-seeding migrations.
INSERT INTO chart_accounts(tenant_id,code,name,type,active)
SELECT t.id,x.code,x.name,x.type,true
FROM tenants t
CROSS JOIN (VALUES
 ('1000','الخزينة','asset'),('1010','البنوك','asset'),('1020','وسائل التحصيل الإلكترونية','asset'),
 ('1100','العملاء','asset'),('1150','مطالبات التأمين','asset'),('1200','المخزون','asset'),
 ('1210','ضريبة مدخلات قابلة للاسترداد','asset'),('1250','دفعات مقدمة للموردين','asset'),
 ('2000','الموردون','liability'),('2050','أرصدة دائنة للعملاء','liability'),
 ('2100','ضريبة مخرجات مستحقة','liability'),('3000','أرصدة افتتاحية','equity'),
 ('4000','المبيعات','revenue'),('4010','مردودات ومسموحات المبيعات','revenue'),
 ('4100','إيرادات التوصيل','revenue'),('4200','فروق زيادة المخزون','revenue'),
 ('5000','تكلفة البضاعة المباعة','cogs'),('5100','فروق وعجز المخزون','expense'),
 ('6000','المصروفات التشغيلية','expense'),('6100','خسائر التلف والانتهاء','expense')
) AS x(code,name,type)
ON CONFLICT(tenant_id,code) DO UPDATE SET active=true;
