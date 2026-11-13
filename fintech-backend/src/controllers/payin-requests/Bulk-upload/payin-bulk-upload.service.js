const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const axios = require("axios");
const payInRequestsService = require("../payin-requests.service");
const { generateSignature } = require("../../../utils/hmac.util");
const prisma = require("../../../../config/prisma");
const auditLogService = require("../../../services/audit-log.service");

class BulkUploadService {
  /**
   * Main function to process bulk upload
   */
  async processBulkUpload({
    filePath,
    originalName,
    reqUser,
    options = {},
    type = "PAYIN",
  }) {
    // 1. Check if merchant has PREMIUM plan
    if (!reqUser || !reqUser.merchantId) {
      throw new Error("User not associated with any merchant");
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: reqUser.merchantId },
      select: {
        id: true,
        planType: true,
        bulkUploadEnabled: true,
        clientSecret: true,
        webhookUrl: true,
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

    // 2. Validate file size (max 5MB)
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 5) {
      throw new Error("File size exceeds 5MB limit");
    }

    // 3. Parse and validate rows
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

    if (normalizedRows.length > 10) {
      throw new Error(
        `Maximum 10 rows allowed per upload. Your file has ${normalizedRows.length} rows.`,
      );
    }

    const mode = options.mode || "instant";
    const scheduleType = options.scheduleType || "immediate";
    const intervalValue = Number(options.intervalValue || 1);
    const intervalUnit = options.intervalUnit || "minutes";

    // 4. Create bulk upload record
    const bulkUpload = await prisma.bulkUpload.create({
      data: {
        merchantId: reqUser.merchantId,
        userId: reqUser.id,
        fileName: originalName,
        fileUrl: `/uploads/bulk/${path.basename(filePath)}`,
        totalRows: normalizedRows.length,
        status: "PENDING",
        mode: mode,
        type: type,
        processedAt: null,
      },
    });

    await prisma.bulkUpload.update({
      where: { id: bulkUpload.id },
      data: { status: "PROCESSING" },
    });

    await auditLogService.logBulkUpload(
      reqUser.id,
      reqUser.merchantId,
      originalName,
      normalizedRows.length,
      "STARTED",
    );

    const intervalMs =
      intervalUnit === "seconds"
        ? intervalValue * 1000
        : intervalValue * 60 * 1000;

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    const processRow = async (row, rowIndex) => {
      try {
        const merchantReference =
          row.merchantReference || this.generateMerchantReference();

        const payload = this.buildPayInPayload(
          row,
          originalName,
          rowIndex,
          merchantReference,
        );

        const clientSecret = merchant.clientSecret;

        const signature = generateSignature(merchantReference, clientSecret);

        const createOptions = {
          ipAddress: options.ipAddress || null,
          userAgent: options.userAgent || null,
          deviceId: options.deviceId || null,
          geolocation: options.geolocation || null,
          signature: signature,
        };

        const created = await payInRequestsService.create(
          payload,
          createOptions,
          reqUser,
        );

        const isUpi =
          payload.paymentMode === "UPI" || payload.paymentMode === "UPI_INTENT";

        results.push({
          rowNumber: rowIndex,
          merchantReference: payload.merchantReference,
          amount: payload.amount,
          paymentMode: payload.paymentMode,
          status: created?.status || "PENDING",
          payInRequestId: created?.id || null,
          intent: isUpi ? created?.intent || null : null,
          intentUrl: isUpi ? created?.url || null : null,
        });

        successCount++;
        processedCount++;

        // Update bulk upload progress
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

        if (index < normalizedRows.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      const finalStatus = "COMPLETED";
      const intentFile = await this.writeUpiIntentFile(bulkUpload.id, results);

      await prisma.bulkUpload.update({
        where: { id: bulkUpload.id },
        data: {
          status: finalStatus,
          successRows: successCount,
          failedRows: failedCount,
          processedAt: new Date(),
          errorReport:
            errors.length > 0 ? this.formatErrorReport(errors) : null,
          upiIntentFileUrl: intentFile?.relativeUrl || null,
          upiIntentCount: intentFile?.count || 0,
        },
      });

      await this.sendWebhookNotification(bulkUpload.id, merchant, {
        status: finalStatus,
        totalRows: normalizedRows.length,
        successRows: successCount,
        failedRows: failedCount,
        errors: errors,
      });

      try {
        if (filePath && fs.existsSync(filePath)) {
          const archiveDir = path.join(
            process.cwd(),
            "uploads",
            "bulk",
            "archive",
          );
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          const fileName = path.basename(filePath);
          const archivePath = path.join(
            archiveDir,
            `${Date.now()}-${fileName}`,
          );
          fs.renameSync(filePath, archivePath);
          console.log(`File archived: ${archivePath}`);
        }
      } catch (error) {
        console.error(`Failed to archive file: ${error.message}`);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }

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

    // Scheduled mode
    const scheduledResults = [];
    const scheduledErrors = [];

    for (const [index, row] of normalizedRows.entries()) {
      const scheduledDate = new Date(options.scheduledTime || new Date());
      const now = new Date();
      const startDelay = Math.max(0, scheduledDate.getTime() - now.getTime());

      const delay =
        scheduleType === "interval"
          ? startDelay + index * intervalMs
          : index === 0
            ? startDelay
            : startDelay + index * intervalMs;

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

        // Check if all rows are processed
        if (index === normalizedRows.length - 1) {
          const finalStatus = "COMPLETED";
          const intentFile = await this.writeUpiIntentFile(
            bulkUpload.id,
            results,
          );

          await prisma.bulkUpload.update({
            where: { id: bulkUpload.id },
            data: {
              status: finalStatus,
              successRows: successCount,
              failedRows: failedCount,
              processedAt: new Date(),
              errorReport:
                scheduledErrors.length > 0
                  ? this.formatErrorReport(scheduledErrors)
                  : null,
              upiIntentFileUrl: intentFile?.relativeUrl || null,
              upiIntentCount: intentFile?.count || 0,
            },
          });

          // Send webhook notification for scheduled mode
          await this.sendWebhookNotification(bulkUpload.id, merchant, {
            status: finalStatus,
            totalRows: normalizedRows.length,
            successRows: successCount,
            failedRows: failedCount,
            errors: scheduledErrors,
          });

          // Update scheduled task status
          const scheduledTask = await prisma.scheduledTask.findFirst({
            where: {
              bulkUploadId: bulkUpload.id,
            },
          });

          if (scheduledTask) {
            await prisma.scheduledTask.update({
              where: {
                id: scheduledTask.id,
              },
              data: {
                status: "COMPLETED",
                processedAt: new Date(),
              },
            });
          }
        }
      }, delay);
    }

    // Clean up uploaded file
    try {
      if (filePath && fs.existsSync(filePath)) {
        const archiveDir = path.join(
          process.cwd(),
          "uploads",
          "bulk",
          "archive",
        );
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }

        const fileName = path.basename(filePath);
        const archivePath = path.join(archiveDir, `${Date.now()}-${fileName}`);
        fs.renameSync(filePath, archivePath);

        console.log(`File archived: ${archivePath}`);
      }
    } catch (error) {
      console.error(`Failed to archive file: ${error.message}`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // Ignore
      }
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
      accepted: true,
      bulkUploadId: bulkUpload.id,
      results: scheduledResults,
      errors: scheduledErrors,
    };
  }

  /**
   * Validate all rows in the file
   */
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

  /**
   * Validate a single row
   */
  validateRow(row, rowNumber) {
    const errors = [];
    const normalized = this.normalizeRow(row, rowNumber);

    if (!normalized) {
      return {
        isValid: false,
        errors: ["Invalid row data"],
        row: null,
      };
    }

    // Check required fields
    if (!normalized.amount || normalized.amount <= 0) {
      errors.push("Amount must be greater than 0");
    }

    if (!normalized.merchantReference) {
      errors.push("Merchant reference is required");
    }

    if (!normalized.currency) {
      errors.push("Currency is required");
    } else if (!["INR", "USD", "EUR"].includes(normalized.currency)) {
      errors.push("Currency must be INR, USD, or EUR");
    }

    if (!normalized.paymentMode) {
      errors.push("Payment mode is required");
    } else if (
      !["CARD", "UPI", "NETBANKING", "WALLET", "PG"].includes(
        normalized.paymentMode,
      )
    ) {
      errors.push("Payment mode must be CARD, UPI, NETBANKING, or WALLET");
    }

    if (!normalized.customerName) {
      errors.push("Customer name is required");
    }

    if (!normalized.customerEmail) {
      errors.push("Customer email is required");
    } else if (!this.isValidEmail(normalized.customerEmail)) {
      errors.push("Invalid email format");
    }

    if (!normalized.customerPhone) {
      errors.push("Customer phone is required");
    } else if (!this.isValidPhone(normalized.customerPhone)) {
      errors.push("Phone number must be 10 digits");
    }

    // FiatPay UPI constraints (must match integration)
    if (
      normalized.paymentMode === "UPI" ||
      normalized.paymentMode === "UPI_INTENT"
    ) {
      if (normalized.amount < 101)
        errors.push("UPI amount must be at least ₹101");
      if (normalized.amount >= 200000)
        errors.push("UPI amount must be less than ₹2,00,000");
      if (normalized.currency !== "INR")
        errors.push("UPI requires INR currency");
      const digits = String(normalized.customerPhone || "").replace(/\D/g, "");
      if (!/^\d{10}$/.test(digits))
        errors.push("UPI requires a 10-digit Indian phone number");
    }

    // Validate card fields if payment mode is CARD
    if (normalized.paymentMode === "CARD") {
      if (!row.cardNumber) {
        errors.push("Card number is required for CARD payment mode");
      } else if (!/^\d{16}$/.test(row.cardNumber)) {
        errors.push("Card number must be 16 digits");
      }

      if (!row.expiryMonth) {
        errors.push("Expiry month is required for CARD payment mode");
      } else if (row.expiryMonth < 1 || row.expiryMonth > 12) {
        errors.push("Expiry month must be between 1 and 12");
      }

      if (!row.expiryYear) {
        errors.push("Expiry year is required for CARD payment mode");
      } else if (row.expiryYear < 2024 || row.expiryYear > 2099) {
        errors.push("Expiry year must be between 2024 and 2099");
      }

      if (!row.cvv) {
        errors.push("CVV is required for CARD payment mode");
      } else if (!/^\d{3,4}$/.test(row.cvv)) {
        errors.push("CVV must be 3-4 digits");
      }

      if (!row.cardHolderName) {
        errors.push("Card holder name is required for CARD payment mode");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      row: normalized,
    };
  }

  /**
   * Parse file (CSV or Excel)
   */
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

  /**
   * Normalize row data (handle case-insensitive keys)
   */
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
      currency: this.getValue(normalized, ["currency", "curr", "ccy"]) || "INR",
      paymentMode:
        this.getValue(normalized, ["paymentmode", "payment_mode", "mode"]) ||
        "PG",
      customerName:
        this.getValue(normalized, ["customername", "customer_name", "name"]) ||
        null,
      customerEmail:
        this.getValue(normalized, [
          "customeremail",
          "customer_email",
          "email",
        ]) || null,
      customerPhone:
        this.getValue(normalized, [
          "customerphone",
          "customer_phone",
          "phone",
          "mobile",
        ]) || null,
      notes:
        this.getValue(normalized, [
          "notes",
          "description",
          "remark",
          "remarks",
        ]) || null,
      cardNumber: row.cardNumber || row["cardNumber"] || null,
      expiryMonth: row.expiryMonth || row["expiryMonth"] || null,
      expiryYear: row.expiryYear || row["expiryYear"] || null,
      cvv: row.cvv || row["cvv"] || null,
      cardHolderName: row.cardHolderName || row["cardHolderName"] || null,
    };
  }

  /**
   * Get value from normalized row by trying multiple keys
   */
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

  /**
   * Build pay-in payload from row data
   */
  buildPayInPayload(row, originalName, rowIndex, merchantReference) {
    const customer = {
      name: row.customerName || null,
      email: row.customerEmail || null,
      phone: row.customerPhone ? String(row.customerPhone) : null,
    };

    const payload = {
      merchantReference: merchantReference,
      amount: Number(row.amount),
      currency: row.currency || "INR",
      paymentMode: row.paymentMode || "PG",
      customer,
      notes: row.notes || `Bulk upload from ${originalName} row ${rowIndex}`,
      metadata: {
        source: "bulk-upload",
        uploadedFile: originalName,
        rowNumber: rowIndex,
      },
    };

    if (row.paymentMode === "CARD" && row.cardNumber) {
      payload.card = {
        cardNumber: String(row.cardNumber),
        expiryMonth: Number(row.expiryMonth),
        expiryYear: Number(row.expiryYear),
        cvv: String(row.cvv),
        cardHolderName: String(row.cardHolderName || row.customerName),
      };
    }

    return payload;
  }

  /**
   * Update bulk upload progress
   */
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
      console.error("Failed to update bulk upload progress:", error);
    }
  }

  /**
   * Format error report with structure
   */
  formatErrorReport(errors) {
    if (!errors || errors.length === 0) return null;

    const errorTypes = {};
    errors.forEach((err) => {
      const key = err.error ? err.error.split(":")[0] || "UNKNOWN" : "UNKNOWN";
      errorTypes[key] = (errorTypes[key] || 0) + 1;
    });

    return {
      summary: {
        totalErrors: errors.length,
        errorTypes: errorTypes,
      },
      details: errors.map((err) => ({
        rowNumber: err.rowNumber,
        merchantReference: err.merchantReference || null,
        error: err.error || "Unknown error",
        timestamp: new Date().toISOString(),
      })),
    };
  }

  /**
   * Write only the raw UPI deep-link (upi://pay?...) strings to a .txt file,
   * one per line. Nothing else.
   */
  async writeUpiIntentFile(bulkUploadId, results) {
    const intents = results
      .filter(
        (r) =>
          typeof r.paymentMode === "string" &&
          r.paymentMode.startsWith("UPI") &&
          r.intentUrl,
      )
      .map((r) => r.intentUrl);

    if (!intents.length) return null;

    const dir = path.join(process.cwd(), "uploads", "bulk", "intents");
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `${bulkUploadId}-upi-intents.txt`;
    fs.writeFileSync(path.join(dir, fileName), intents.join("\n"), "utf8");

    return {
      relativeUrl: `/uploads/bulk/intents/${fileName}`,
      count: intents.length,
    };
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(bulkUploadId, merchant, data) {
    if (!merchant?.webhookUrl) {
      console.log("No webhook URL configured for merchant");
      return;
    }

    try {
      const payload = {
        event: "bulk_upload.completed",
        timestamp: new Date().toISOString(),
        data: {
          bulkUploadId,
          merchantId: merchant.id,
          ...data,
        },
      };

      const signature = generateSignature(
        JSON.stringify(payload),
        merchant.clientSecret || "default-secret",
      );

      await axios.post(merchant.webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": "bulk_upload.completed",
        },
        timeout: 10000,
      });

      console.log(`Webhook sent for bulk upload ${bulkUploadId}`);
    } catch (error) {
      console.error(
        `Webhook failed for bulk upload ${bulkUploadId}:`,
        error.message,
      );
      try {
        await prisma.outboundLog.create({
          data: {
            merchantId: merchant.id,
            eventType: "BULK_UPLOAD_COMPLETED",
            requestBody: payload,
            responseBody: error.response?.data || null,
            status: "FAILED",
            amount: data.totalRows || 0,
            responseStatus: error.response?.status || 500,
            createdAt: new Date(),
          },
        });
      } catch (logError) {
        console.error("Failed to log webhook failure:", logError.message);
      }
    }
  }

  /**
   * Get bulk upload history
   */
  async getHistory(merchantId, userId, pagination = {}, filters = {}) {
    const { offset = 0, limit = 10 } = pagination;
    const { status, type } = filters;

    const where = {
      merchantId: merchantId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
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
        select: {
          id: true,
          merchantId: true,
          userId: true,
          fileName: true,
          fileUrl: true,
          totalRows: true,
          successRows: true,
          failedRows: true,
          status: true,
          mode: true,
          errorReport: true,
          processedAt: true,
          createdAt: true,
          updatedAt: true,
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

  /**
   * Get bulk upload by ID
   */
  async getBulkUploadById(id, merchantId) {
    const bulkUpload = await prisma.bulkUpload.findFirst({
      where: {
        id: id,
        merchantId: merchantId,
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

  /**
   * Retry failed rows
   */
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

  /**
   * Generate unique merchant reference
   */
  generateMerchantReference() {
    const prefix = "BULK";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (international support)
   */
  isValidPhone(phone) {
    if (!phone) return false;

    // Convert to string and remove all non-numeric characters
    const phoneStr = String(phone);
    const cleaned = phoneStr.replace(/[^0-9]/g, "");
    const phoneRegex = /^\d{7,15}$/;

    return phoneRegex.test(cleaned);
  }

  /**
   * Generate CSV template
   */
  generateTemplate() {
    const headers = [
      "amount",
      "currency",
      "merchantReference",
      "paymentMode",
      "customerName",
      "customerEmail",
      "customerPhone",
      "cardNumber",
      "expiryMonth",
      "expiryYear",
      "cvv",
      "cardHolderName",
    ];

    const csvContent = [
      headers.join(","),
      "15,EUR,ORD-BULK-001,CARD,Emma Wilson,emma.wilson@example.com,33612345678,4242424242424240,12,2026,123,Emma Wilson",
      "100,INR,ORD-BULK-002,UPI,John Doe,john@example.com,9876543210,not required,not required,not required,not required,not required",
      "50,USD,ORD-BULK-003,NETBANKING,Lucas Martin,lucas.martin@example.com,33612345678,not required,not required,not required,not required,not required",
      "70,USD,ORD-BULK-004,WALLET,Sophie Brown,sophie.brown@example.com,49151234567,not required,not required,not required,not required,not required",
    ].join("\n");

    return csvContent;
  }

  /**
   * Get all uploads across all merchants
   */
  async getAllHistory(filters = {}, pagination = {}) {
    const { offset = 0, limit = 10 } = pagination;
    const { status, search, dateFrom, dateTo, type } = filters;

    const where = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.fileName = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
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

  /**
   * ADMIN: Get admin statistics
   */
  async getAdminStats() {
    const where = { type: "PAYIN" };
    const [
      totalUploads,
      sums,
      uploadsByStatus,
      topMerchantGroup,
      topUserGroup,
      monthlyTrend,
    ] = await Promise.all([
      prisma.bulkUpload.count({ where }),
      prisma.bulkUpload.aggregate({
        where,
        _sum: { totalRows: true, successRows: true, failedRows: true },
      }),
      prisma.bulkUpload.groupBy({ by: ["status"], where, _count: true }),
      prisma.bulkUpload.groupBy({
        by: ["merchantId"],
        where,
        _count: true,
        orderBy: { _count: { merchantId: "desc" } },
        take: 1,
      }),
      prisma.bulkUpload.groupBy({
        by: ["userId"],
        where,
        _count: true,
        orderBy: { _count: { userId: "desc" } },
        take: 1,
      }),
      prisma.$queryRaw`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY') as month,
          COUNT(*) as count
        FROM "bulk_uploads"
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
          AND "type" = 'PAYIN'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") DESC
        LIMIT 6
      `,
    ]);

    let topMerchant = null;
    if (topMerchantGroup.length > 0) {
      const m = await prisma.merchant.findUnique({
        where: { id: topMerchantGroup[0].merchantId },
        select: { id: true, name: true },
      });
      topMerchant = m
        ? { ...m, uploadCount: topMerchantGroup[0]._count }
        : null;
    }

    let topUser = null;
    if (topUserGroup.length > 0) {
      const u = await prisma.user.findUnique({
        where: { id: topUserGroup[0].userId },
        select: { id: true, fullName: true, email: true },
      });
      topUser = u ? { ...u, uploadCount: topUserGroup[0]._count } : null;
    }

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
      topMerchant,
      topUser,
      uploadsByStatus: {
        COMPLETED: statusMap.COMPLETED || 0,
        PROCESSING: statusMap.PROCESSING || 0,
        PENDING: statusMap.PENDING || 0,
        FAILED: statusMap.FAILED || 0,
      },
      monthlyTrend: monthlyTrend
        ? monthlyTrend.map((item) => ({
            month: item.month,
            count:
              typeof item.count === "bigint" ? Number(item.count) : item.count,
          }))
        : [],
    };
  }

  /**
   * ADMIN: Get bulk upload by ID without merchant filter
   */
  async getBulkUploadByIdAdmin(id) {
    const bulkUpload = await prisma.bulkUpload.findUnique({
      where: { id: id },
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
}

module.exports = new BulkUploadService();
