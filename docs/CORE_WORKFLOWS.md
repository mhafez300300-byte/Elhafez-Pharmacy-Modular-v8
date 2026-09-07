# Core Business Workflows

## Sale
Auth/Permission → server pricing/discount validation → FEFO row locks → stock + sale + payment/cash + journal bundle → invariant validation → atomic commit → committed document returned to UI.

## Sale Return
Validate original sale/remaining returnable quantity → inspection/disposition → inventory/provenance restoration or quarantine/waste → customer/insurance/loyalty adjustments → refund/cash + reversing journal → atomic commit.

## Purchase
Supplier/invoice uniqueness lock → server totals/tax validation → cash/shift preflight when needed → receive batches and provenance → supplier balance + stock movement + journal → atomic commit.

## Supplier Return
Validate supplier receipt provenance → reduce stock → apply supplier credit/payable reduction → update provenance → journal → atomic commit.

## Shift / Expense
Cash module owns shift lifecycle and expense financial bundles. The server resolves/validates the authoritative open shift; UI-provided shift state is not trusted for posting.

## Clinical Safety
Clinical module owns interaction/allergy checks. Sales consumes the capability through an injected contract; the clinical implementation is not imported by Sales.

## Reconciliation
Cross-module read-only integrity inspection. Safe repair may rebuild deterministic projections/metadata only; it never invents cash movements, stock movements, or accounting entries.
