# Database Ownership

المصدر التنفيذي للملكية هو `src/contracts/store-ownership.ts`، وأي تغيير هنا يجب أن يرافقه Migration/Contract/Test عند الحاجة.

| Module | Owned compatibility stores |
|---|---|
| organization | settings, branches, cashboxes |
| identity | users, roles, attendance |
| catalog | products, priceHistory, priceUpdates, importRuns, offers |
| inventory | batches, stockMoves, counts, transfers, serialItems, trackEvents, pushList, shortageNotes |
| customers | customers, customerPayments |
| suppliers | suppliers, supplierPayments |
| sales | sales, returns, heldSales, orders, deliveryAgents |
| purchases | purchases, purchaseOrders, supplierReturns |
| cash | cashMoves, shifts, expenses |
| accounting | journal |
| clinical | prescriptions, doctors, recalls |
| contracts | contracts, claims |
| loyalty | loyalty |
| system | audit |

`compatibility-data` لا يملك Business Data. هو بوابة Backward Compatibility فقط، ويتحقق أن كل Store له Owner معلن، ويمنع الكتابة العامة للـposted/critical stores التي تتطلب Atomic Use Case.
