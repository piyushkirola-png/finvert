const fs = require("fs");
const path = require("path");

const basePath = path.join(__dirname, "../prisma/schema");
const outputPath = path.join(__dirname, "../prisma/schema.prisma");

const safeRead = (fileName) => {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: Schema file not found: ${fileName} - skipping`);
    return "";
  }
  return fs.readFileSync(filePath, "utf-8").trim();
};

try {
  const datasourceContent = `generator client {
        provider        = "prisma-client-js"
        previewFeatures = ["prismaSchemaFolder"]
      }

      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }`;

  const filesInOrder = [
    // 1. Enums
    "enums.prisma",

    // 2. Gateways & Related
    "gateways.prisma",
    "gateway-merchant-mappings.prisma",
    "gateway-failure-logs.prisma",

    // 3. Merchants & Related
    "merchants.prisma",
    "merchant-documents.prisma",
    "merchant-rates.prisma",
    "merchant-routing-preference.prisma",

    // 4. Users & Related
    "users.prisma",
    "user-sessions.prisma",
    "password-resets.prisma",
    "permissions.prisma",
    "user-permissions.prisma",
    "audit-logs.prisma",

    // 5. PayIn
    "payin-requests.prisma",
    "payin-wallets.prisma",
    "payin-wallet-summary.prisma",

    // 6. PayOut
    "payout-requests.prisma",
    "payout-wallets.prisma",
    "payout-wallet-summary.prisma",

    // 7. Refunds
    "refunds.prisma",
    "refund-logs.prisma",

    // 8. Chargebacks
    "chargebacks.prisma",
    "chargeback-logs.prisma",

    // 9. Settlements
    "settlements.prisma",

    // 10. Webhooks
    "inbound-webhooks.prisma",
    "outbound-webhooks.prisma",

    // 11. CSV Export
    "csv-export.prisma",

    // 12. Queue
    "queue.prisma",

    // 14. Currency Rates
    "currency-rates.prisma",

    // 15. Risk Blocks
    "risk-blocks.prisma",

    // 19. Bulk Uploads
    "bulk-uploads.prisma",
    "scheduled-tasks.prisma",
  ];

  const schemas = [];
  for (const fileName of filesInOrder) {
    const content = safeRead(fileName);
    if (content) {
      schemas.push(content);
    }
  }

  const finalSchema = [datasourceContent, ...schemas].join("\n\n").trim();
  fs.writeFileSync(outputPath, finalSchema);

  console.log("✅ Prisma schema generated successfully!");
  console.log(`📁 Total files processed: ${filesInOrder.length}`);
} catch (error) {
  console.error("❌ Prisma build failed:", error.message);
  process.exit(1);
}
