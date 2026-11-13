/**
 * Queue Configuration
 * No Redis needed - uses Prisma/PostgreSQL as queue storage
 */
const queueConfig = {
  // Maximum jobs to process in one batch
  batchSize: 10000,

  // Default retry settings
  defaultRetryLimit: 3,

  // Default delay before first retry (in milliseconds)
  defaultRetryDelay: 5000, // 5 seconds

  // Job types
  jobTypes: {
    WEBHOOK_RETRY: "webhook_retry",
    PAYMENT_RETRY: "payment_retry",
    BULK_UPLOAD: "bulk_upload",
  },

  // Queue status values (matches Prisma schema)
  status: {
    COMPLETED: "COMPLETED",
    PENDING: "PENDING",
    FAILED: "FAILED",
  },

  // How often to process queue (cron schedule)
  processingSchedule: "* * * * *", // Every minute
};

module.exports = queueConfig;
