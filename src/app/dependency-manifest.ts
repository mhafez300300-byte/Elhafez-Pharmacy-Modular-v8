export const dependencyManifest = {
  "system": {
    "routes": [
      "APP_VERSION",
      "firstTenant",
      "nowIso",
      "ownerProviderBrand",
      "ownerSetupMeta",
      "pool",
      "rowValue",
      "safeUser"
    ],
    "service": [
      "fs"
    ]
  },
  "identity": {
    "routes": [
      "auditDb",
      "base32Encode",
      "cookie",
      "crypto",
      "decryptSecret",
      "dropSessionCache",
      "encryptSecret",
      "firstTenant",
      "issueSession",
      "needAuth",
      "path",
      "pool",
      "rateLimit",
      "safeUser",
      "scryptHash",
      "sha256",
      "verifyCurrentCredential",
      "verifyHash",
      "verifyTotp"
    ],
    "service": [
      "APP_SECRET",
      "APP_VERSION",
      "READ_DEPS",
      "STORE_PERMISSION",
      "crypto",
      "path",
      "pool",
      "randomToken",
      "sha256"
    ]
  },
  "organization": {
    "routes": [
      "needAuth",
      "pool"
    ]
  },
  "sales": {
    "routes": [
      "hasPerm",
      "needAuth",
      "needPerm",
      "pool",
      "redactRecordForUser",
      "rowValue"
    ],
    "service": [
      "Finance",
      "accountCode",
      "clinicalAlertsForProducts",
      "consumeReceiptProvenance",
      "contractActiveOn",
      "deriveSaleBenefits",
      "deriveSaleReturn",
      "hasAction",
      "insuranceSettlement",
      "nextDocumentNumber",
      "nowIso",
      "restoreReceiptProvenance",
      "saleBasePrice",
      "saleOfferPrice",
      "saleUnitFactor",
      "sanitizeRecord",
      "serverId",
      "validateFefoAllocation",
      "validateSaleDocument"
    ]
  },
  "cash": {
    "routes": [
      "Finance",
      "needAuth",
      "nowIso",
      "pool",
      "putRecord"
    ],
    "service": [
      "Finance",
      "nowIso",
      "sanitizeRecord"
    ]
  },
  "inventory": {
    "routes": [
      "hasAction",
      "hasPerm",
      "needAuth",
      "needPerm",
      "pool",
      "redactRecordForUser",
      "rowValue"
    ],
    "service": [
      "Finance",
      "accountCode"
    ]
  },
  "reporting": {
    "routes": [
      "Finance",
      "dropSessionCache",
      "hasAction",
      "hasPerm",
      "needAuth",
      "needPerm",
      "pool"
    ]
  },
  "reconciliation": {
    "routes": [
      "auditDb",
      "buildFinancialReconciliation",
      "bumpChange",
      "ensureLicenseWritable",
      "hasAction",
      "hasPerm",
      "needAuth",
      "nowIso",
      "pool",
      "putRecord"
    ],
    "service": [
      "nowIso"
    ]
  },
  "compatibility-data": {
    "routes": [
      "BULK_CLEAR_SAFE_STORES",
      "DIRECT_WRITE_BLOCKED_STORES",
      "POSTED_IMMUTABLE_STORES",
      "STORES",
      "assertUserGrant",
      "auditDb",
      "bumpChange",
      "canReadStore",
      "canWriteStore",
      "checkLicenseLimit",
      "delRecord",
      "deleteStoreProjections",
      "dropSessionCache",
      "encryptSecret",
      "ensureLicenseWritable",
      "firstTenant",
      "getRecord",
      "issueSession",
      "needAction",
      "needAuth",
      "needPerm",
      "ownerManagedClaims",
      "ownerOfStore",
      "pool",
      "putRecord",
      "querySearchFields",
      "redactRecordForUser",
      "rowValue",
      "safeSortExpr",
      "safeUser",
      "scryptHash",
      "sha256",
      "standaloneSetupAllowed"
    ],
    "service": [
      "Finance",
      "accountCode",
      "backfillCore",
      "branchOf",
      "deleteProjection",
      "fs",
      "path",
      "pool",
      "projectRecord",
      "rootDir",
      "rowValue",
      "runMigrations",
      "sanitizeRecord"
    ]
  },
  "transactions": {
    "routes": [
      "INTENT_STORES",
      "POSTED_IMMUTABLE_STORES",
      "STORES",
      "applyAtomicOp",
      "applySalePutBatch",
      "auditDb",
      "bumpChange",
      "canWriteStore",
      "coalesceAtomicOperations",
      "ensureLicenseWritable",
      "hasAction",
      "hasPerm",
      "licenseFeature",
      "needAuth",
      "nowIso",
      "operationDates",
      "periodLocked",
      "pool",
      "prepareExpenseCommercial",
      "prepareInsuranceClaimsCommercial",
      "prepareInventoryCommercial",
      "preparePurchaseCommercial",
      "prepareReturnCommercial",
      "prepareSaleCommercial",
      "prepareShiftCommercial",
      "prepareSupplierReturnCommercial",
      "redactRecordForUser",
      "sanitizeRecord",
      "serverId",
      "validateFinancialBundle",
      "validateOperationalCashMoveShifts"
    ],
    "service": [
      "branchOf",
      "delRecord",
      "projectRecord",
      "putRecord",
      "sanitizeRecord",
      "validateJournalRecord"
    ]
  },
  "clinical": {
    "routes": [
      "auditDb",
      "clinicalAlertsForProducts",
      "needAuth",
      "needPerm",
      "pool"
    ],
    "service": []
  },
  "integrations": {
    "routes": [
      "auditDb",
      "bumpChange",
      "crypto",
      "hasAction",
      "licenseFeature",
      "needAuth",
      "needPerm",
      "nowIso",
      "pool",
      "putRecord"
    ]
  },
  "accounting": {
    "routes": [
      "Finance",
      "accountCode",
      "accountingRows",
      "auditDb",
      "bumpChange",
      "currentDeviceContext",
      "currentOpenShiftForPayment",
      "ensureLicenseWritable",
      "getRecord",
      "hasPerm",
      "needAction",
      "needAuth",
      "needPerm",
      "nowIso",
      "paymentAccount",
      "periodLocked",
      "pool",
      "putRecord",
      "serverId",
      "validatePeriodRange"
    ],
    "service": [
      "pool"
    ]
  },
  "backup": {
    "routes": [
      "backfillCore",
      "backupKey",
      "chromiumBin",
      "crypto",
      "dropSessionCache",
      "execFileAsync",
      "express",
      "fs",
      "makeBackup",
      "needAction",
      "needAuth",
      "os",
      "ownerProviderBrand",
      "path",
      "pool",
      "salePdfHtml",
      "sha256"
    ],
    "service": [
      "APP_SECRET",
      "APP_VERSION",
      "crypto",
      "fs",
      "nowIso",
      "path",
      "pool",
      "rootDir",
      "sha256"
    ]
  },
  "platform": {
    "routes": [
      "APP_VERSION",
      "compareVersions",
      "crypto",
      "encryptSecret",
      "firstTenant",
      "needAction",
      "needAuth",
      "needPerm",
      "pool",
      "rateLimit",
      "sha256"
    ],
    "service": [
      "APP_VERSION",
      "crypto",
      "decryptSecret",
      "pool",
      "sha256"
    ]
  },
  "purchases": {
    "service": [
      "Finance",
      "accountCode",
      "consumeReceiptProvenance",
      "nextDocumentNumber",
      "nowIso",
      "sanitizeRecord",
      "serverId"
    ]
  }
} as const;
