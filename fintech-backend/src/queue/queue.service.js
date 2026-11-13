const prisma = require("../../config/prisma");

/**
 * Queue Service - Processes background jobs using Prisma
 */
class QueueService {
  /**
   * Process pending jobs from the queue
   * Called by cron job every minute
   */
  async processPendingJobs() {
    try {
      // Get pending jobs that are due
      const pendingJobs = await prisma.queue.findMany({
        where: {
          status: "PENDING",
          nextCheckAt: {
            lte: new Date(),
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 10000, // Process at a time
      });

      if (pendingJobs.length === 0) {
        return { processed: 0, message: "No pending jobs" };
      }

      console.log(`[Queue] Processing ${pendingJobs.length} jobs`);

      let processed = 0;
      let failed = 0;

      for (const job of pendingJobs) {
        try {
          await this.processJob(job);
          processed++;
        } catch (error) {
          failed++;
          console.error(`[Queue] Job ${job.id} failed:`, error.message);
          await this.markJobFailed(job.id, error.message);
        }
      }

      return {
        processed,
        failed,
        total: pendingJobs.length,
      };
    } catch (error) {
      console.error("[Queue] Error processing jobs:", error.message);
      throw error;
    }
  }

  /**
   * Process a single job based on type
   */
  async processJob(job) {
    const metadata = job.metadata || {};
    const type = metadata.type;

    console.log(`[Queue] Processing job ${job.id}, type: ${type}`);

    switch (type) {
      case "webhook_retry":
        await this.processWebhookRetry(job);
        break;

      case "payment_retry":
        await this.processPaymentRetry(job);
        break;

      case "bulk_upload":
        await this.processBulkUpload(job);
        break;

      default:
        console.log(`[Queue] Unknown job type: ${type}, marking as failed`);
        await this.markJobFailed(job.id, `Unknown job type: ${type}`);
        return;
    }

    // Mark job as completed
    await this.markJobCompleted(job.id);
  }

  /**
   * Process webhook retry job
   */
  async processWebhookRetry(job) {
    const axios = require("axios");
    const logId = job.metadata?.logId;

    if (!logId) {
      throw new Error("Missing logId in webhook retry job");
    }

    // Get the outbound log
    const log = await prisma.outboundLog.findUnique({
      where: { id: parseInt(logId) },
    });

    if (!log) {
      throw new Error(`Outbound log ${logId} not found`);
    }

    if (log.status === "SUCCESS") {
      console.log(`[Queue] Webhook ${logId} already succeeded, skipping`);
      return;
    }

    // Get merchant webhook URL
    const merchant = await prisma.merchant.findUnique({
      where: { id: log.merchantId },
    });

    if (!merchant?.webhookUrl) {
      throw new Error(`Merchant ${log.merchantId} has no webhook URL`);
    }

    // Retry webhook
    try {
      console.log(
        `[Queue] Retrying webhook ${logId} to ${merchant.webhookUrl}`,
      );

      const response = await axios.post(merchant.webhookUrl, log.requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Update log as success
      await prisma.outboundLog.update({
        where: { id: log.id },
        data: {
          status: "SUCCESS",
          responseStatus: response.status,
          responseBody: response.data,
          processedAt: new Date(),
        },
      });

      console.log(`[Queue] Webhook ${logId} retry succeeded`);
    } catch (error) {
      console.error(`[Queue] Webhook ${logId} retry failed:`, error.message);

      // Update log with failure
      await prisma.outboundLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          responseStatus: error.response?.status || 500,
          responseBody: error.response?.data || error.message,
          processedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Process payment retry job
   */
  async processPaymentRetry(job) {
    const requestId = job.metadata?.requestId;
    const requestType = job.metadata?.requestType; // "payin" or "payout"

    if (!requestId || !requestType) {
      throw new Error("Missing requestId or requestType in payment retry");
    }

    console.log(
      `[Queue] Processing payment retry for ${requestType} ${requestId}`,
    );

    return;
  }

  /**
   * Process bulk upload job
   */
  async processBulkUpload(job) {
    const bulkUploadId = job.metadata?.bulkUploadId;

    if (!bulkUploadId) {
      throw new Error("Missing bulkUploadId in bulk upload job");
    }

    console.log(`[Queue] Processing bulk upload ${bulkUploadId}`);

    // Get bulk upload record
    const bulkUpload = await prisma.bulkUpload.findUnique({
      where: { id: parseInt(bulkUploadId) },
    });

    if (!bulkUpload) {
      throw new Error(`Bulk upload ${bulkUploadId} not found`);
    }

    return;
  }

  /**
   * Mark job as completed
   */
  async markJobCompleted(jobId) {
    await prisma.queue.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(jobId, errorMessage) {
    await prisma.queue.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        updatedAt: new Date(),
        metadata: {
          error: errorMessage,
          failedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Add a job to the queue
   */
  async addJob(data) {
    const {
      userReferenceId,
      bankReferenceId,
      gatewayId,
      amount = 0,
      maxRetryLimit = 3,
      nextCheckAt = new Date(Date.now() + 5000), // 5 seconds from now
      metadata = {},
    } = data;

    const job = await prisma.queue.create({
      data: {
        userReferenceId,
        bankReferenceId,
        gatewayId,
        status: "PENDING",
        amount,
        retryCount: 0,
        maxRetryLimit,
        nextCheckAt,
        lastCheckedAt: new Date(),
        metadata,
      },
    });

    console.log(`[Queue] Added job ${job.id} (${metadata.type || "unknown"})`);
    return job;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId) {
    const job = await prisma.queue.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== "FAILED") {
      throw new Error(`Job ${jobId} is not in FAILED state`);
    }

    if (job.retryCount >= job.maxRetryLimit) {
      throw new Error(`Job ${jobId} has exceeded max retry limit`);
    }

    const updated = await prisma.queue.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        retryCount: job.retryCount + 1,
        nextCheckAt: new Date(Date.now() + 5000),
        lastCheckedAt: new Date(),
        metadata: {
          ...job.metadata,
          retriedAt: new Date().toISOString(),
        },
      },
    });

    return updated;
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [completed, pending, failed] = await Promise.all([
      prisma.queue.count({ where: { status: "COMPLETED" } }),
      prisma.queue.count({ where: { status: "PENDING" } }),
      prisma.queue.count({ where: { status: "FAILED" } }),
    ]);

    return {
      completed,
      pending,
      failed,
      total: completed + pending + failed,
    };
  }

  /**
   * Clean old completed jobs
   */
  async cleanOldJobs(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.queue.deleteMany({
      where: {
        status: { in: ["COMPLETED", "FAILED"] },
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[Queue] Cleaned ${result.count} old jobs`);
    return result;
  }
}

module.exports = new QueueService();
