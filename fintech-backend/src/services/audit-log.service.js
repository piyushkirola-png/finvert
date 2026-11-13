const prisma = require("../../config/prisma");

/**
 * Audit Log Service
 * Tracks all user actions across the system
 */
class AuditLogService {
  /**
   * Log an action
   */
  async log(data) {
    this._logAsync(data).catch((err) =>
      console.error("[AuditLog] Async log failed:", err.message),
    );
    return { success: true, queued: true };
  }

  async _logAsync(data) {
    try {
      const logEntry = {
        userId: data.userId ? parseInt(data.userId) : null,
        merchantId: data.merchantId ? parseInt(data.merchantId) : null,
        action: data.action || "UNKNOWN_ACTION",
        resource: data.resource || data.action?.split("_")[0] || "UNKNOWN",
        resourceId:
          data.resourceId || data.requestId ? String(data.requestId) : null,
        status: data.status || null,
        amount: data.amount ? parseFloat(data.amount) : null,
        description: data.description || null,
        changes: data.changes || null,
        details: data.details || data.metadata || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: data.createdAt || new Date(),
      };

      await prisma.auditLog.create({
        data: logEntry,
      });
    } catch (error) {
      console.error("[AuditLog] Failed to save audit log:", error.message);
      return null;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters = {}) {
    const where = {};

    if (filters.userId) where.userId = parseInt(filters.userId);
    if (filters.merchantId) where.merchantId = parseInt(filters.merchantId);
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.status) where.status = filters.status;
    if (filters.resourceId) where.resourceId = String(filters.resourceId);

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { resource: { contains: filters.search, mode: "insensitive" } },
        { resourceId: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const orderBy = {};
    const orderField = filters.orderBy || "createdAt";
    const orderDirection = filters.order || "desc";
    orderBy[orderField] = orderDirection;

    const limit = filters.limit ? parseInt(filters.limit) : 50;
    const offset = filters.offset ? parseInt(filters.offset) : 0;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return { total, limit, offset, logs };
  }

  /**
   * Get audit log by ID
   */
  async getLogById(id) {
    const log = await prisma.auditLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!log) throw new Error("Audit log not found");
    return log;
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userId, pagination = {}) {
    return this.getLogs({ userId, ...pagination });
  }

  /**
   * Get logs for a specific merchant
   */
  async getMerchantLogs(merchantId, pagination = {}) {
    return this.getLogs({ merchantId, ...pagination });
  }

  /**
   * Get logs by resource type
   */
  async getLogsByResource(resource, pagination = {}) {
    return this.getLogs({ resource, ...pagination });
  }

  /**
   * Get logs by action
   */
  async getLogsByAction(action, pagination = {}) {
    return this.getLogs({ action, ...pagination });
  }

  /**
   * Get logs by status
   */
  async getLogsByStatus(status, pagination = {}) {
    return this.getLogs({ status, ...pagination });
  }

  /**
   * Get logs by date range
   */
  async getLogsByDateRange(startDate, endDate, pagination = {}) {
    return this.getLogs({ startDate, endDate, ...pagination });
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(limit = 20) {
    return this.getLogs({ limit, orderBy: "createdAt", order: "desc" });
  }

  /**
   * Get logs summary
   */
  async getLogsSummary(filters = {}) {
    const where = {};

    if (filters.merchantId) where.merchantId = parseInt(filters.merchantId);
    if (filters.userId) where.userId = parseInt(filters.userId);

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [total, actions, resources, statuses] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.auditLog.groupBy({
        by: ["resource"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.auditLog.groupBy({
        by: ["status"],
        where: { ...where, status: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      actions: actions.map((a) => ({ action: a.action, count: a._count.id })),
      resources: resources.map((r) => ({
        resource: r.resource,
        count: r._count.id,
      })),
      statuses: statuses.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }

  /**
   * Clean old logs
   */
  async cleanOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    console.log(
      `[AuditLog] Cleaned ${result.count} logs older than ${daysToKeep} days`,
    );
    return result;
  }

  // ========== CONVENIENCE METHODS ==========

  /**
   * Log successful login
   */
  async logLogin(userId, email, ipAddress, userAgent) {
    return this.log({
      action: "LOGIN_SUCCESS",
      resource: "Auth",
      userId,
      description: `User ${email} logged in successfully`,
      ipAddress,
      userAgent,
      status: "SUCCESS",
      details: { email },
    });
  }

  /**
   * Log failed login
   */
  async logFailedLogin(email, ipAddress, userAgent, reason) {
    return this.log({
      action: "LOGIN_FAILED",
      resource: "Auth",
      userId: null,
      description: `Failed login attempt for ${email}`,
      ipAddress,
      userAgent,
      status: "FAILED",
      details: { email, reason },
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId, email) {
    return this.log({
      action: "LOGOUT",
      resource: "Auth",
      userId,
      description: `User ${email} logged out`,
      status: "SUCCESS",
      details: { email },
    });
  }

  /**
   * Log password change
   */
  async logPasswordChange(userId, email) {
    return this.log({
      action: "PASSWORD_CHANGED",
      resource: "User",
      userId,
      description: `User ${email} changed password`,
      status: "SUCCESS",
      details: { email },
    });
  }

  /**
   * Log password reset
   */
  async logPasswordReset(userId, email) {
    return this.log({
      action: "PASSWORD_RESET",
      resource: "User",
      userId,
      description: `User ${email} reset password`,
      status: "SUCCESS",
      details: { email },
    });
  }

  /**
   * Log user creation
   */
  async logUserCreated(adminId, newUserEmail, newUserRole) {
    return this.log({
      action: "USER_CREATED",
      resource: "User",
      userId: adminId,
      description: `Admin created user ${newUserEmail} with role ${newUserRole}`,
      status: "SUCCESS",
      details: { email: newUserEmail, role: newUserRole },
    });
  }

  /**
   * Log user update
   */
  async logUserUpdated(adminId, userId, email, changes) {
    return this.log({
      action: "USER_UPDATED",
      resource: "User",
      userId: adminId,
      resourceId: userId,
      description: `Admin updated user ${email}`,
      changes,
      status: "SUCCESS",
      details: { email, updatedUser: userId },
    });
  }

  /**
   * Log user deleted (deactivated)
   */
  async logUserDeleted(adminId, userId, email) {
    return this.log({
      action: "USER_DELETED",
      resource: "User",
      userId: adminId,
      resourceId: userId,
      description: `Admin deactivated user ${email}`,
      status: "SUCCESS",
      details: { email },
    });
  }

  /**
   * Log merchant creation
   */
  async logMerchantCreated(userId, merchantName, merchantEmail) {
    return this.log({
      action: "MERCHANT_CREATED",
      resource: "Merchant",
      userId,
      description: `Merchant ${merchantName} (${merchantEmail}) created`,
      status: "SUCCESS",
      details: { name: merchantName, email: merchantEmail },
    });
  }

  /**
   * Log merchant update
   */
  async logMerchantUpdated(userId, merchantId, merchantName, changes) {
    return this.log({
      action: "MERCHANT_UPDATED",
      resource: "Merchant",
      userId,
      resourceId: merchantId,
      description: `Merchant ${merchantName} updated`,
      changes,
      status: "SUCCESS",
      details: { name: merchantName, merchantId },
    });
  }

  /**
   * Log pay-in request
   */
  async logPayInRequest(
    userId,
    merchantId,
    requestId,
    amount,
    status = "CREATED",
    details = {},
  ) {
    return this.log({
      action: `PAYIN_REQUEST_${status}`,
      resource: "PayInRequest",
      userId,
      merchantId,
      resourceId: requestId,
      amount,
      status: status === "CREATED" ? "PENDING" : status,
      description: `Pay-in request ${requestId} for ₹${amount}`,
      details,
    });
  }

  /**
   * Log payout request
   */
  async logPayOutRequest(
    userId,
    merchantId,
    requestId,
    amount,
    status = "CREATED",
    details = {},
  ) {
    return this.log({
      action: `PAYOUT_REQUEST_${status}`,
      resource: "PayOutRequest",
      userId,
      merchantId,
      resourceId: requestId,
      amount,
      status: status === "CREATED" ? "PENDING" : status,
      description: `Pay-out request ${requestId} for ₹${amount}`,
      details,
    });
  }

  /**
   * Log webhook received
   */
  async logWebhookReceived(gateway, eventType, payload) {
    return this.log({
      action: "WEBHOOK_RECEIVED",
      resource: "Webhook",
      userId: null,
      description: `Webhook received from ${gateway}: ${eventType}`,
      status: "SUCCESS",
      details: { gateway, eventType, payload },
    });
  }

  /**
   * Log webhook sent
   */
  async logWebhookSent(merchantId, eventType, webhookUrl, status = "PENDING") {
    return this.log({
      action: "WEBHOOK_SENT",
      resource: "Webhook",
      merchantId,
      status,
      description: `Webhook sent to ${webhookUrl}: ${eventType}`,
      details: { eventType, webhookUrl },
    });
  }

  /**
   * Log API key generated
   */
  async logApiKeyGenerated(userId, merchantId, keyType) {
    return this.log({
      action: "API_KEY_GENERATED",
      resource: "Merchant",
      userId,
      merchantId,
      description: `API key generated for merchant ${merchantId}`,
      status: "SUCCESS",
      details: { keyType },
    });
  }

  /**
   * Log chargeback
   */
  async logChargeback(
    userId,
    merchantId,
    chargebackId,
    amount,
    status = "CREATED",
  ) {
    return this.log({
      action: `CHARGEBACK_${status}`,
      resource: "Chargeback",
      userId,
      merchantId,
      resourceId: chargebackId,
      amount,
      status: status === "CREATED" ? "PENDING" : status,
      description: `Chargeback ${chargebackId} for ₹${amount}`,
      details: { chargebackId },
    });
  }

  /**
   * Log refund
   */
  async logRefund(userId, merchantId, refundId, amount, status = "CREATED") {
    return this.log({
      action: `REFUND_${status}`,
      resource: "Refund",
      userId,
      merchantId,
      resourceId: refundId,
      amount,
      status: status === "CREATED" ? "PENDING" : status,
      description: `Refund ${refundId} for ₹${amount}`,
      details: { refundId },
    });
  }

  /**
   * Log bulk upload
   */
  async logBulkUpload(
    userId,
    merchantId,
    fileType,
    recordCount,
    status = "STARTED",
  ) {
    return this.log({
      action: `BULK_UPLOAD_${status}`,
      resource: "BulkUpload",
      userId,
      merchantId,
      status: status === "STARTED" ? "PROCESSING" : status,
      description: `Bulk upload ${fileType} with ${recordCount} records`,
      details: { fileType, recordCount },
    });
  }

  /**
   * Log system event
   */
  async logSystemEvent(action, description, details = {}) {
    return this.log({
      action: `SYSTEM_${action}`,
      resource: "System",
      userId: null,
      description,
      status: "SUCCESS",
      details,
    });
  }

  /**
   * Log error
   */
  async logError(error, req, context = {}) {
    return this.log({
      action: "ERROR_OCCURRED",
      resource: "Error",
      userId: req?.user?.id || null,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
      description: error.message || "Unknown error",
      status: "ERROR",
      details: {
        error: error.message,
        stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
        path: req?.path,
        method: req?.method,
        ...context,
      },
    });
  }

  /**
   * Log merchant IP whitelist change
   */
  async logIpWhitelistChange(userId, merchantId, action, ipAddress) {
    return this.log({
      action: `IP_WHITELIST_${action}`,
      resource: "Merchant",
      userId,
      merchantId,
      description: `IP ${action.toLowerCase()} from whitelist: ${ipAddress}`,
      status: "SUCCESS",
      details: { ipAddress, merchantId },
    });
  }

  /**
   * Log gateway routing change
   */
  async logGatewayRoutingChange(userId, merchantId, gatewayId, action) {
    return this.log({
      action: `GATEWAY_ROUTING_${action}`,
      resource: "GatewayRouting",
      userId,
      merchantId,
      description: `Gateway ${gatewayId} ${action.toLowerCase()} for merchant ${merchantId}`,
      status: "SUCCESS",
      details: { gatewayId, merchantId },
    });
  }

  /**
   * Log settlement processed
   */
  async logSettlement(
    userId,
    merchantId,
    settlementId,
    amount,
    status = "PROCESSED",
  ) {
    return this.log({
      action: `SETTLEMENT_${status}`,
      resource: "Settlement",
      userId,
      merchantId,
      resourceId: settlementId,
      amount,
      status,
      description: `Settlement ${settlementId} for ₹${amount}`,
      details: { settlementId },
    });
  }
}

module.exports = new AuditLogService();
