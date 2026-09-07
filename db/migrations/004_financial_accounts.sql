INSERT INTO chart_accounts(tenant_id,code,name,type,active)
SELECT t.id,v.code,v.name,v.type,true FROM tenants t CROSS JOIN (VALUES
 ('1250','دفعات مقدمة للموردين','asset'),
 ('2050','أرصدة دائنة للعملاء','liability')
) AS v(code,name,type)
ON CONFLICT(tenant_id,code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,active=true;
