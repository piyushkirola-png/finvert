const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cron = require("node-cron");

// Import routes
const authRoutes = require("./src/routes/auth.routes");
const apiPlaygroundRoutes = require("./src/routes/api-playground.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const analyticsRoutes = require("./src/routes/analytics.routes");
const usersRoutes = require("./src/routes/users.routes");
const gatewayRoutes = require("./src/routes/gateway.routes");
const gatewayMerchantMappingsRoutes = require("./src/routes/gateway-merchant-mappings.routes");
const merchantRoutes = require("./src/routes/merchants.routes");
const merchantRegistrationRoutes = require("./src/routes/merchant-registration.routes");
const merchantRatesRoutes = require("./src/routes/merchant-rates.routes");
const merchantDocumentsRoutes = require("./src/routes/merchant-documents.routes");
const merchantRoutingRoutes = require("./src/routes/merchant-routing.routes");
const fxRatesRoutes = require("./src/routes/fx-rates.routes");
const payinRequestsRoutes = require("./src/routes/payin-requests.routes");
const payinBulkUploadRoutes = require("./src/routes/payin-bulk-upload.routes");
const payinWalletRoutes = require("./src/routes/payin-wallet.routes");
const payinWalletSummaryRoutes = require("./src/routes/payin-wallet-summaries.routes");
const payoutRequestsRoutes = require("./src/routes/payout-requests.routes");
const payoutBulkUploadRoutes = require("./src/routes/payout-bulk-upload.routes");
const payoutWalletRoutes = require("./src/routes/payout-wallet.routes");
const payoutWalletSummaryRoutes = require("./src/routes/payout-wallet-summaries.routes");
const orchestratorRoutes = require("./src/routes/orchestrator.routes");
const riskBlocksRoutes = require("./src/routes/risk-blocks.routes");
const webhookRoutes = require("./src/routes/webhooks.routes");
const settlementRoutes = require("./src/routes/settlements.routes");
const chargebackRoutes = require("./src/routes/chargebacks.routes");
const refundRoutes = require("./src/routes/refunds.routes");
const csvExportRoutes = require("./src/routes/csv-export.routes");
const currencyMiddleware = require("./src/middleware/currency.middleware");
const queueService = require("./src/queue/queue.service");

// ========== RATE LIMIT IMPORT ==========
const {
  defaultLimiter,
  authLimiter,
  paymentLimiter,
  strictLimiter,
} = require("./src/middleware/rate-limit.middleware");

// ========== ERROR HANDLER IMPORT ==========
const {
  errorHandler,
  notFoundHandler,
} = require("./src/middleware/error-handler.middleware");

const payinWalletSummaryService = require("./src/controllers/payin-wallet-summaries/payin-wallet-summaries.service");
const fxRatesService = require("./src/controllers/fx-rates/fx-rates.service");
const prisma = require("./config/prisma");

const app = express();
app.set("trust proxy", 1);

// CORS with fallback
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://portal.decorvault.online",
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== RATE LIMITING MIDDLEWARE ==========

// Apply default rate limiting to all API routes (1000 req/min)
app.use("/api", defaultLimiter);

// Auth routes - 500 req/min (high limit for normal usage)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Payment endpoints - 500 req/min (high TPS)
// app.use("/api/payin-requests", paymentLimiter);
// app.use("/api/payout-requests", paymentLimiter);
// app.use("/api/payin-wallets", paymentLimiter);
// app.use("/api/payout-wallets", paymentLimiter);
// app.use("/api/payin-bulk-upload", paymentLimiter);
// app.use("/api/payout-bulk-upload", paymentLimiter);

// Sensitive admin operations - 10 req/min
app.use("/api/users", strictLimiter);
app.use("/api/merchants", strictLimiter);
app.use("/api/gateway", strictLimiter);
app.use("/api/settlements", strictLimiter);
app.use("/api/chargebacks", strictLimiter);
app.use("/api/refunds", strictLimiter);

// ========== ALL ROUTES ==========
app.use("/api/auth", authRoutes);
app.use(currencyMiddleware);
app.use("/api/api-playground", apiPlaygroundRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/csv", csvExportRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/merchant-registration", merchantRegistrationRoutes);
app.use("/api/merchant-rates", merchantRatesRoutes);
app.use("/api/merchant-documents", merchantDocumentsRoutes);
app.use("/api/merchant-routing", merchantRoutingRoutes);
app.use("/api/fx-rates", fxRatesRoutes);
app.use("/api/payin-requests", payinRequestsRoutes);
app.use("/api/payin-bulk-upload", payinBulkUploadRoutes);
app.use("/api/payin-wallets", payinWalletRoutes);
app.use("/api/payin-wallet-summaries", payinWalletSummaryRoutes);
app.use("/api/payout-requests", payoutRequestsRoutes);
app.use("/api/payout-bulk-upload", payoutBulkUploadRoutes);
app.use("/api/payout-wallets", payoutWalletRoutes);
app.use("/api/payout-wallet-summaries", payoutWalletSummaryRoutes);
app.use("/api/gateway", gatewayRoutes);
app.use("/api/gateway-merchant-mappings", gatewayMerchantMappingsRoutes);
app.use("/api/orchestrator", orchestratorRoutes);
app.use("/api/risk-blocks", riskBlocksRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/chargebacks", chargebackRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/uploads", express.static("uploads"));

// TEST ROUTES (skip rate limiting)
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// 404 handler - using the new error handler
app.use(notFoundHandler);

// Error handler - using the new error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// Cron job 1: Daily wallet summary refresh
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 0 * * *";

cron.schedule(
  CRON_SCHEDULE,
  async () => {
    console.log(
      `🔄 Running daily summary refresh at ${new Date().toISOString()}`,
    );
    try {
      await payinWalletSummaryService.refreshAllSummaries();
      console.log(`✅ Daily refresh completed`);
    } catch (error) {
      console.error(`❌ Daily refresh failed:`, error.message);
    }
  },
  { timezone: "UTC" },
);

// Cron job 2: FX rates update every 6 hours
cron.schedule(
  "0 */6 * * *",
  async () => {
    try {
      const result = await fxRatesService.fetchAndStoreRates();
      console.log(`✅ FX rates updated: ${result.message}`);
    } catch (error) {
      console.error(`❌ FX rates update failed:`, error.message);
    }
  },
  { timezone: "Asia/Kolkata" },
);

// Cron job 3: Clean up old bulk upload files
cron.schedule(
  "0 2 * * *",
  async () => {
    console.log(
      `🧹 Running bulk upload file cleanup at ${new Date().toISOString()}`,
    );
    try {
      const fs = require("fs");
      const path = require("path");
      const uploadDir = path.join(process.cwd(), "uploads", "bulk");
      const archiveDir = path.join(uploadDir, "archive");

      // Delete files older than 7 days
      const retentionDays = 7;
      const now = Date.now();

      // Clean main upload directory
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          if (file === "archive") continue;

          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

          if (ageInDays > retentionDays) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old file: ${file}`);
          }
        }
      }

      // Clean archive directory
      if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir);
        for (const file of files) {
          const filePath = path.join(archiveDir, file);
          const stats = fs.statSync(filePath);
          const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

          if (ageInDays > retentionDays * 2) {
            // Keep archived files longer
            fs.unlinkSync(filePath);
            console.log(`Deleted old archived file: ${file}`);
          }
        }
      }

      console.log(`✅ File cleanup completed`);
    } catch (error) {
      console.error(`❌ File cleanup failed:`, error.message);
    }
  },
  { timezone: "UTC" },
);

// Cron job 4: Process queue every minute
// cron.schedule(
//   "* * * * *",
//   async () => {
//     try {
//       const result = await queueService.processPendingJobs();
//       if (result.processed > 0) {
//         console.log(`✅ Queue processed ${result.processed} jobs`);
//       }
//     } catch (error) {
//       console.error(`❌ Queue processing failed:`, error.message);
//     }
//   },
//   { timezone: "UTC" },
// );

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    process.exit(1);
  }
}

startServer();