# Elhafez Pharmacy — Engineering Constitution

هذا المستند هو الدستور الهندسي الثابت للمشروع. أي طلب مستقبلي يضاف فوق هذه القواعد ولا يلغيها إلا بطلب صريح يغيّر قاعدة محددة.

## القواعد الملزمة
1. المصدر الخلفي TypeScript والمعمارية Modular Monolith مقسمة حسب Business Domains.
2. لكل Module ملكية واضحة لمنطق العمل والبيانات، ولا يستورد التفاصيل الداخلية لـModule آخر.
3. الربط بين الـModules يتم فقط عبر Contracts/Interfaces وخلال Composition Root، أو Events عند الحاجة.
4. ممنوع Circular Dependencies وممنوع Service Locator مفتوح يُمرر كل النظام لأي Module.
5. أي تعديل يتم في أصغر Scope صحيح؛ لا Refactor عام بسبب طلب صغير.
6. UI/Presentation منفصل عن Business Logic وعن Data Access. الواجهة لا تملك قواعد مالية أو مخزنية authoritative.
7. التصميم يعتمد Design Tokens ومكونات UI مشتركة؛ لا تكرر الألوان/الأنماط الجديدة عشوائيًا.
8. Shared/Core صغير ومخصص للبنية العامة فقط: DB, errors, logging, money primitives, events, common runtime helpers.
9. Business Logic لا يُنقل إلى Shared لمجرد إعادة الاستخدام؛ يوضع عند مالكه ويُعرض بعقد واضح.
10. ملكية البيانات معلنة في `src/contracts/store-ownership.ts`. أي Store توافقية بلا Owner تعتبر غير صالحة.
11. تعديل Schema يتم عبر Migration فقط، مع Constraints/Indexes/Transactions في PostgreSQL عند الحاجة.
12. العمليات المالية/المخزنية المترابطة Atomic: COMMIT كامل أو ROLLBACK كامل، ولا Partial State.
13. لا تكرر Function/Service/Repository/Component/Helper قبل البحث عن الموجود وإعادة استخدامه.
14. Feature الجديدة توضع داخل Module واضح، والاختيارية يمكن عزلها بـFeature Flag عندما يكون ذلك مفيدًا.
15. شاشة Settings تجمع الإعدادات فقط؛ كل إعداد Business يظل مملوكًا للـModule المسؤول عنه.
16. أسماء الملفات والدوال واضحة؛ ممنوع أسماء ترقيع مثل fix2/finalFinal/temp/copy/old2 داخل المصدر.
17. إصلاح Bug يبدأ بـRoot Cause ثم Owner Module ثم أقل إصلاح صحيح ثم Regression Test؛ ممنوع Patch فوق Patch.
18. Dependencies الخارجية قليلة ومثبتة بإصدارات واضحة؛ لا تضاف مكتبة إذا الموجود يفي بالغرض.
19. الملفات عالية التماسك ومنخفضة الاقتران؛ لا نخلط UI + API + Business + DB في ملف واحد.
20. API Contracts مستقرة؛ تغيير Contract يستلزم تحديد المستهلكين واختبارهم والحفاظ على Backward Compatibility قدر الإمكان.
21. الواجهة Responsive من البداية لـMobile/Tablet/Laptop/Desktop.
22. Error Handling موحد، قابل للتتبع، ولا يكشف أسرارًا للمستخدم.
23. الصلاحيات Server-side إلزامية؛ إخفاء الزر في UI ليس Authorization.
24. العمليات المهمة Audit-able بالمستخدم والوقت والمصدر والكيان والتغيير عند الحاجة.
25. كل Module مهم له Unit/Integration/API/DB tests حسب مسؤوليته، والعمليات الحرجة لها Regression/E2E coverage.
26. قبل أي تعديل: افحص الكود الفعلي، المالك، dependencies، DB/API/UI impact، ثم نفذ أقل تغيير.
27. ممنوع تعديل `dist` يدويًا، backup source files، نسخ موازية من الوظيفة، أو تغيير Architecture بسبب Bug صغير.
28. إزالة Feature تبدأ بتحليل Dependencies ثم إزالة UI/API/Business/Permissions/Events/Dead Code بدون حذف Shared مستخدم.
29. أي بناء/Feature جديدة تبدأ بتحديد Architecture/Module/Contract/Data ownership/Test plan قبل التنفيذ.

## Gate إلزامي قبل التسليم
- `npm run build`
- `npm run check`
- `npm test`
- Regression للوظائف المتأثرة
- UAT حي مع PostgreSQL في بيئة معزولة قبل استخدام أموال أو بيانات حقيقية
