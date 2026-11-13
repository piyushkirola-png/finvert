const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const payoutRequestsService = require("../payout-requests.service");
const prisma = require("../../../../config/prisma");
const auditLogService = require("../../../services/audit-log.service");

class PayoutBulkUploadService {
  async processBulkUpload({
    filePath,
    originalName,
    reqUser,
    options = {},
    type = "PAYOUT",
  }) {
    if (!reqUser || !reqUser.merchantId) {
      throw new Error("User not associated with any merchant");
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: reqUser.merchantId },
      select: {
        id: true,
        planType: true,
        bulkUploadEnabled: true,
      },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    if (merchant.planType !== "PREMIUM" || !merchant.bulkUploadEnabled) {
      throw new Error(
        "Bulk upload is only available for PREMIUM merchants. Please upgrade your plan.",
      );
    }

    if (!filePath) {
      throw new Error("No file path provided");
    }

    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 5) {
      throw new Error("File size exceeds 5MB limit");
    }

    const rows = await this.parseFile(filePath, originalName);
    const validationResults = this.validateAllRows(rows);

    if (validationResults.invalidRows.length > 0) {
      return {
        success: false,
        message: "Validation failed",
        invalidRows: validationResults.invalidRows,
        totalRows: rows.length,
        validRows: validationResults.validRows.length,
        invalidCount: validationResults.invalidRows.length,
      };
    }

    const normalizedRows = validationResults.validRows;

    if (!normalizedRows.length) {
      throw new Error("No valid rows found in the uploaded file");
    }

    if (normalizedRows.length > 100000) {
      throw new Error("Maximum 100000 rows allowed per upload");
    }

    const bulkUpload = await prisma.bulkUpload.create({
      data: {
        merchantId: reqUser.merchantId,
        userId: reqUser.id,
        fileName: originalName,
        fileUrl: filePath,
        totalRows: normalizedRows.length,
        status: "PROCESSING",
        type: type,
      },
    });

    await auditLogService.logBulkUpload(
      reqUser.id,
      reqUser.merchantId,
      originalName,
      normalizedRows.length,
      "STARTED",
    );

    const mode = options.mode || "instant";
    const scheduleType = options.scheduleType || "immediate";
    const intervalValue = Number(options.intervalValue || 1);
    const intervalUnit = options.intervalUnit || "minutes";

    const intervalMs =
      intervalUnit === "seconds"
        ? intervalValue * 1000
        : intervalValue * 60 * 1000;

    // Initial delay if a specific future scheduledTime was supplied
    let initialDelayMs = 0;
    if (options.scheduledTime) {
      const target = new Date(options.scheduledTime).getTime();
      if (!Number.isNaN(target)) {
        initialDelayMs = Math.max(0, target - Date.now());
      }
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    const buildErrorReport = (errs) => {
      if (!errs.length) return null;
      const errorTypes = {};
      for (const e of errs) {
        const key = e.error || "Unknown error";
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      }
      return {
        summary: {
          totalErrors: errs.length,
          errorTypes,
        },
        details: errs,
      };
    };

    const processRow = async (row, rowIndex) => {
      try {
        const merchantReference =
          row.merchantReference || this.generateMerchantReference();

        const payload = this.buildPayload(
          row,
          originalName,
          rowIndex,
          merchantReference,
        );

        const created = await payoutRequestsService.create(
          payload,
          {
            ipAddress: options.ipAddress || null,
            userAgent: options.userAgent || null,
            deviceId: options.deviceId || null,
            geolocation: options.geolocation || null,
          },
          reqUser,
        );

        results.push({
          rowNumber: rowIndex,
          merchantReference: payload.merchantReference,
          amount: payload.amount,
          status: created?.status || "PENDING",
          payoutRequestId: created?.id || null,
        });

        successCount++;
        processedCount++;

        await this.updateBulkUploadProgress(bulkUpload.id, {
          successRows: successCount,
          failedRows: failedCount,
          processedCount: processedCount,
          totalRows: normalizedRows.length,
        });
      } catch (error) {
        errors.push({
          rowNumber: rowIndex,
          merchantReference: row.merchantReference || null,
          error: error.message,
        });
        failedCount++;
        processedCount++;

        await this.updateBulkUploadProgress(bulkUpload.id, {
          successRows: successCount,
          failedRows: failedCount,
          processedCount: processedCount,
          totalRows: normalizedRows.length,
        });
      }
    };

    if (mode === "instant") {
      for (const [index, row] of normalizedRows.entries()) {
        await processRow(row, index + 2);
      }

      await prisma.bulkUpload.update({
        where: { id: bulkUpload.id },
        data: {
          status: "COMPLETED",
          successRows: successCount,
          failedRows: failedCount,
          processedAt: new Date(),
          errorReport: buildErrorReport(errors),
        },
      });

      await auditLogService.logBulkUpload(
        reqUser.id,
        reqUser.merchantId,
        originalName,
        normalizedRows.length,
        "COMPLETED",
      );

      return {
        success: true,
        mode,
        fileName: originalName,
        totalRows: normalizedRows.length,
        processedCount: results.length,
        successCount,
        failedCount,
        results,
        errors,
        bulkUploadId: bulkUpload.id,
      };
    }

    // ===== SCHEDULED MODE =====
    // We return immediately; rows are processed asynchronously.
    const scheduledResults = [];
    const scheduledErrors = [];

    for (const [index, row] of normalizedRows.entries()) {
      const perRowDelay =
        scheduleType === "interval"
          ? index * intervalMs
          : index === 0
            ? 0
            : index * intervalMs;

      const delay = initialDelayMs + perRowDelay;

      setTimeout(async () => {
        try {
          await processRow(row, index + 2);
          scheduledResults.push({
            rowNumber: index + 2,
            merchantReference: row.merchantReference || null,
          });
        } catch (error) {
          scheduledErrors.push({
            rowNumber: index + 2,
            merchantReference: row.merchantReference || null,
            error: error.message,
          });
        }

        if (index === normalizedRows.length - 1) {
          await prisma.bulkUpload.update({
            where: { id: bulkUpload.id },
            data: {
              status: "COMPLETED",
              successRows: successCount,
              failedRows: failedCount,
              processedAt: new Date(),
              errorReport: buildErrorReport(scheduledErrors),
            },
          });
        }
      }, delay);
    }

    return {
      success: true,
      mode,
      fileName: originalName,
      totalRows: normalizedRows.length,
      scheduledCount: normalizedRows.length,
      intervalMs,
      intervalUnit,
      scheduleType,
      initialDelayMs,
      accepted: true,
      bulkUploadId: bulkUpload.id,
      results: scheduledResults,
      errors: scheduledErrors,
    };
  }

  validateAllRows(rows) {
    const validRows = [];
    const invalidRows = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const validation = this.validateRow(row, rowNumber);

      if (validation.isValid) {
        validRows.push(validation.row);
      } else {
        invalidRows.push({
          rowNumber,
          errors: validation.errors,
          data: row,
        });
      }
    });

    return { validRows, invalidRows };
  }

  validateRow(row, rowNumber) {
    const errors = [];
    const normalized = this.normalizeRow(row, rowNumber);

    if (!normalized) {
      return { isValid: false, errors: ["Invalid row data"], row: null };
    }

    if (!normalized.amount || normalized.amount <= 0) {
      errors.push("Amount must be greater than 0");
    }

    if (!normalized.merchantReference) {
      errors.push("Merchant reference is required");
    }

    if (!normalized.paymentMode) {
      errors.push("Payment mode is required");
    } else if (
      !["BANK", "UPI", "CARD", "WALLET"].includes(normalized.paymentMode)
    ) {
      errors.push("Payment mode must be BANK, UPI, CARD, or WALLET");
    }

    if (!normalized.beneficiaryName) {
      errors.push("Beneficiary name is required");
    }

    if (!normalized.beneficiaryAccount) {
      errors.push("Beneficiary account is required");
    }

    if (!normalized.beneficiaryBank) {
      errors.push("Beneficiary bank is required");
    }

    if (!normalized.beneficiaryIfsc) {
      errors.push("Beneficiary IFSC is required");
    } else if (!this.isValidIfsc(normalized.beneficiaryIfsc)) {
      errors.push("Beneficiary IFSC must be a valid 11-character code");
    }

    return {
      isValid: errors.length === 0,
      errors,
      row: normalized,
    };
  }

  async parseFile(filePath, originalName) {
    const extension = path.extname(originalName || "").toLowerCase();

    if (!fs.existsSync(filePath)) {
      throw new Error("Uploaded file was not saved successfully");
    }

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });

      if (!rows || !rows.length) {
        throw new Error("The selected file does not contain any data rows");
      }

      return rows;
    } catch (error) {
      throw new Error(
        `Unable to parse ${extension || "file"}: ${error.message}`,
      );
    }
  }

  normalizeRow(row, rowNumber) {
    if (!row || typeof row !== "object") {
      return null;
    }

    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key === null || key === undefined) {
        return;
      }
      normalized[
        key
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
      ] = value;
    });

    return {
      rowNumber,
      merchantReference: this.getValue(normalized, [
        "merchantreference",
        "merchantref",
        "reference",
        "orderid",
      ]),
      amount: Number(this.getValue(normalized, ["amount", "amt", "amountinr"])),
      paymentMode:
        this.getValue(normalized, ["paymentmode", "payment_mode", "mode"]) ||
        "BANK",
      beneficiaryName:
        this.getValue(normalized, [
          "beneficiaryname",
          "beneficiary_name",
          "name",
        ]) || null,
      beneficiaryAccount:
        this.getValue(normalized, [
          "beneficiaryaccount",
          "accountnumber",
          "account",
        ]) || null,
      beneficiaryBank:
        this.getValue(normalized, ["beneficiarybank", "bank", "bankname"]) ||
        null,
      beneficiaryIfsc:
        this.getValue(normalized, ["beneficiaryifsc", "ifsc", "ifsccode"]) ||
        null,
      notes:
        this.getValue(normalized, [
          "notes",
          "description",
          "remark",
          "remarks",
        ]) || null,
    };
  }

  getValue(normalizedRow, keys) {
    for (const key of keys) {
      if (
        normalizedRow[key] !== undefined &&
        normalizedRow[key] !== null &&
        normalizedRow[key] !== ""
      ) {
        return normalizedRow[key];
      }
    }
    return null;
  }

  buildPayload(row, originalName, rowIndex, merchantReference) {
    return {
      merchantReference,
      amount: Number(row.amount),
      paymentMode: row.paymentMode || "BANK",
      beneficiary: {
        name: row.beneficiaryName,
        account: row.beneficiaryAccount ? String(row.beneficiaryAccount) : null,
        bank: row.beneficiaryBank,
        ifsc: row.beneficiaryIfsc,
      },
      notes: row.notes || `Bulk upload from ${originalName} row ${rowIndex}`,
      metadata: {
        source: "payout-bulk-upload",
        uploadedFile: originalName,
        rowNumber: rowIndex,
      },
    };
  }

  async updateBulkUploadProgress(bulkUploadId, data) {
    try {
      await prisma.bulkUpload.update({
        where: { id: bulkUploadId },
        data: {
          successRows: data.successRows || 0,
          failedRows: data.failedRows || 0,
        },
      });
    } catch (error) {
      console.error("Failed to update payout bulk upload progress:", error);
    }
  }

  async getHistory(merchantId, userId, pagination = {}, filters = {}) {
    const { offset = 0, limit = 10 } = pagination;
    const { type, status } = filters;

    const where = { merchantId };

    if (userId) {
      where.userId = userId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [total, history] = await Promise.all([
      prisma.bulkUpload.count({ where }),
      prisma.bulkUpload.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return { history, total };
  }

  async getBulkUploadById(id, merchantId) {
    const bulkUpload = await prisma.bulkUpload.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!bulkUpload) {
      throw new Error("Bulk upload record not found");
    }

    return bulkUpload;
  }

  generateMerchantReference() {
    const prefix = "PAYOUT-BULK";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  isValidIfsc(ifsc) {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
  }

  generateTemplate() {
    const headers = [
      "merchantReference",
      "amount",
      "paymentMode",
      "beneficiaryName",
      "beneficiaryAccount",
      "beneficiaryBank",
      "beneficiaryIfsc",
      "notes",
    ];

    const sampleRow = [
      "PAYOUT-001",
      "5000",
      "BANK",
      "John Doe",
      "1234567890",
      "State Bank of India",
      "SBIN0001234",
      "Bulk payout sample",
    ];

    return [headers.join(","), sampleRow.join(",")].join("\n");
  }

  // ========== ADMIN METHODS ==========
  async getAdminHistory(pagination = {}, filters = {}) {
    const { offset = 0, limit = 10 } = pagination;
    const { status, type } = filters;

    const where = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [total, history] = await Promise.all([
      prisma.bulkUpload.count({ where }),
      prisma.bulkUpload.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return { history, total };
  }

  async getAdminBulkUploadById(id) {
    const bulkUpload = await prisma.bulkUpload.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!bulkUpload) {
      throw new Error("Bulk upload record not found");
    }

    return bulkUpload;
  }

  async getAdminStats() {
    const where = { type: "PAYOUT" };
    const [totalUploads, sums, uploadsByStatus] = await Promise.all([
      prisma.bulkUpload.count({ where }),
      prisma.bulkUpload.aggregate({
        where,
        _sum: { totalRows: true, successRows: true, failedRows: true },
      }),
      prisma.bulkUpload.groupBy({ by: ["status"], where, _count: true }),
    ]);

    const statusMap = {};
    uploadsByStatus.forEach((i) => {
      statusMap[i.status] = i._count;
    });
    const t = sums._sum;

    return {
      totalUploads,
      totalRows: t.totalRows || 0,
      totalSuccessRows: t.successRows || 0,
      totalFailedRows: t.failedRows || 0,
      overallSuccessRate: `${
        t.totalRows > 0
          ? ((t.successRows / t.totalRows) * 100).toFixed(1)
          : "0.0"
      }%`,
      uploadsByStatus: {
        COMPLETED: statusMap.COMPLETED || 0,
        PROCESSING: statusMap.PROCESSING || 0,
        PENDING: statusMap.PENDING || 0,
        FAILED: statusMap.FAILED || 0,
      },
    };
  }

  async retryFailedRows(bulkUploadId, merchantId) {
    const bulkUpload = await prisma.bulkUpload.findFirst({
      where: {
        id: bulkUploadId,
        merchantId: merchantId,
      },
    });

    if (!bulkUpload) {
      throw new Error("Bulk upload not found");
    }

    if (!bulkUpload.errorReport) {
      throw new Error("No errors to retry");
    }

    const failedRows = bulkUpload.errorReport.details || [];
    if (failedRows.length === 0) {
      throw new Error("No failed rows to retry");
    }

    return {
      success: true,
      retriedCount: failedRows.length,
      message: `Retrying ${failedRows.length} failed rows`,
    };
  }
}

module.exports = new PayoutBulkUploadService();
