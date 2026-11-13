const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");
const prisma = require("../../../config/prisma");
const { decrypt } = require("../../utils/encryption.util");

class CsvExportService {
  constructor() {
    this.exportsDir = path.join(process.cwd(), "storage", "exports");
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  async requestCsvExport(user, exportType, options = {}) {
    const { merchantId, startDate, endDate, filters, sorts } = options;

    const csvExport = await prisma.csvExport.create({
      data: {
        userId: user.id,
        merchantId: merchantId || user.merchantId || null,
        exportType: exportType,
        filters: filters || null,
        sorts: sorts || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "PENDING",
      },
    });

    this.generateCsvWorker(csvExport.id, user).catch((err) => {
      console.error(`Error generating CSV for export ${csvExport.id}:`, err);
    });

    return {
      exportId: csvExport.id,
      message: "CSV generation started successfully",
    };
  }

  async generateCsvWorker(exportId, user) {
    try {
      await prisma.csvExport.update({
        where: { id: exportId },
        data: { status: "PROCESSING" },
      });

      const csvExport = await prisma.csvExport.findUnique({
        where: { id: exportId },
      });
      if (!csvExport) return;

      const filterOptions = {
        filters: csvExport.filters || null,
        sorts: csvExport.sorts || null,
      };

      let csvData = "";
      switch (csvExport.exportType) {
        case "PAYIN_REQUESTS":
          csvData = await this.generatePayInRequestsCsv(
            user,
            csvExport.merchantId || undefined,
            csvExport.startDate || undefined,
            csvExport.endDate || undefined,
            filterOptions,
          );
          break;
        case "PAYOUT_REQUESTS":
          csvData = await this.generatePayOutRequestsCsv(
            user,
            csvExport.merchantId || undefined,
            csvExport.startDate || undefined,
            csvExport.endDate || undefined,
            filterOptions,
          );
          break;
        case "PAYIN_WALLETS":
          csvData = await this.generatePayInWalletsCsv(
            user,
            csvExport.merchantId || undefined,
            csvExport.startDate || undefined,
            csvExport.endDate || undefined,
            filterOptions,
          );
          break;
        case "PAYOUT_WALLETS":
          csvData = await this.generatePayOutWalletsCsv(
            user,
            csvExport.merchantId || undefined,
            csvExport.startDate || undefined,
            csvExport.endDate || undefined,
            filterOptions,
          );
          break;
        case "SETTLEMENTS":
          csvData = await this.generateSettlementsCsv(
            user,
            csvExport.merchantId || undefined,
            filterOptions,
          );
          break;
        case "CHARGEBACKS":
          csvData = await this.generateChargebacksCsv(
            user,
            csvExport.merchantId || undefined,
            filterOptions,
          );
          break;
        case "REFUNDS":
          csvData = await this.generateRefundsCsv(
            user,
            csvExport.merchantId || undefined,
            filterOptions,
          );
          break;
        default:
          throw new Error(`Unknown export type: ${csvExport.exportType}`);
      }

      if (!csvData || csvData.length === 0) {
        throw new Error("No data to export");
      }

      const filePath = path.join(this.exportsDir, `export-${exportId}.csv`);
      fs.writeFileSync(filePath, csvData);

      const stats = fs.statSync(filePath);

      await prisma.csvExport.update({
        where: { id: exportId },
        data: {
          status: "COMPLETED",
          fileUrl: filePath,
          fileSize: stats.size,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`CSV Worker failed for export ${exportId}:`, error);
      await prisma.csvExport.update({
        where: { id: exportId },
        data: { status: "FAILED" },
      });
    }
  }

  async getMyExports(user) {
    return prisma.csvExport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        exportType: true,
        status: true,
        filters: true,
        startDate: true,
        endDate: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
        generatedAt: true,
      },
    });
  }

  async getExportFileUrl(exportId, user) {
    const csvExport = await prisma.csvExport.findUnique({
      where: { id: exportId },
    });

    if (!csvExport) {
      throw new Error("Export not found");
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN" &&
      csvExport.userId !== user.id
    ) {
      throw new Error("Access denied");
    }

    if (csvExport.status !== "COMPLETED" || !csvExport.fileUrl) {
      throw new Error("File is not ready yet or failed to generate");
    }

    if (!fs.existsSync(csvExport.fileUrl)) {
      throw new Error("File not found on server");
    }

    return csvExport.fileUrl;
  }

  sanitizeCsvField(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.startsWith("=") || str.startsWith("@")) {
      return "'" + str;
    }
    return str;
  }

  formatDate(date) {
    if (!date) return "";

    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).formatToParts(new Date(date));

    const get = (t) => parts.find((p) => p.type === t)?.value || "";

    const dd = get("day");
    const mm = get("month");
    const yyyy = get("year");
    const hh = get("hour");
    const minutes = get("minute");
    const seconds = get("second");
    const ampm = get("dayPeriod").toUpperCase(); // "AM" or "PM"

    return `${dd}/${mm}/${yyyy}, ${hh}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   *  Generate CSV for PayIn Requests
   */
  async generatePayInRequestsCsv(
    user,
    merchantId,
    startDate,
    endDate,
    filterOptions,
  ) {
    const where = {};

    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = new Date(startDate);
      if (endDate) where.requestedAt.lte = new Date(endDate);
    }

    // Apply filters
    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "status":
            where.status = value;
            break;
          case "paymentMode":
            where.paymentMode = value;
            break;
          case "gatewayId":
            where.gatewayId = Number(value);
            break;
          case "merchantId":
            where.merchantId = Number(value);
            break;
          case "userId":
            where.userId = Number(value);
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
          case "search":
            where.OR = [
              { merchantReference: { contains: value, mode: "insensitive" } },
              { metadata: { path: ["utr"], string_contains: value } },
            ];
            break;
          case "feeType":
            where.feeType = value;
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { requestedAt: "desc" };

    const requests = await prisma.payInRequest.findMany({
      where,
      select: {
        id: true,
        merchantId: true,
        gatewayId: true,
        userId: true,
        amount: true,
        status: true,
        merchantReference: true,
        gatewayReference: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        paymentMode: true,
        gatewayRate: true,
        taxRate: true,
        feeType: true,
        feeRate: true,
        feeAmount: true,
        taxAmount: true,
        amountToCredit: true,
        requestedAt: true,
        completedAt: true,
        createdAt: true,
        responseLog: true,
        metadata: true,
        platformProfit: true,
        amountInINR: true,
        merchantRate: true,
        currency: true,
        merchant: {
          select: { id: true, name: true, email: true },
        },
        gateway: {
          select: { id: true, name: true },
        },
      },
      orderBy,
    });

    if (requests.length === 0) return "";

    const csvData = requests.map((req) => {
      let utr = "";
      try {
        if (req.metadata) {
          const metadata =
            typeof req.metadata === "string"
              ? JSON.parse(req.metadata)
              : req.metadata;

          if (metadata.responseLog) {
            const responseLog =
              typeof metadata.responseLog === "string"
                ? JSON.parse(metadata.responseLog)
                : metadata.responseLog;
            utr =
              responseLog?.data?.payment?.utr ||
              responseLog?.data?.acquirer_data?.rrn ||
              "";
          }

          if (!utr) {
            utr =
              metadata?.utr || metadata?.rrn || metadata?.bankReference || "";
          }
        }

        if (!utr && req.responseLog) {
          const responseLog =
            typeof req.responseLog === "string"
              ? JSON.parse(req.responseLog)
              : req.responseLog;
          utr =
            responseLog?.data?.payment?.utr ||
            responseLog?.data?.acquirer_data?.rrn ||
            "";
        }
      } catch (e) {
        utr = "";
      }

      return {
        id: req.id,
        merchantId: req.merchantId,
        gatewayId: req.gatewayId,
        userId: req.userId,
        merchantName: this.sanitizeCsvField(req.merchant?.name),
        gatewayName: this.sanitizeCsvField(req.gateway?.name),
        amount: Number(req.amount).toFixed(2),
        status: req.status,
        merchantReference: this.sanitizeCsvField(req.merchantReference),
        gatewayReference: this.sanitizeCsvField(req.gatewayReference),
        customerName: this.sanitizeCsvField(req.customerName),
        customerEmail: this.sanitizeCsvField(req.customerEmail),
        customerPhone: this.sanitizeCsvField(req.customerPhone),
        paymentMode: this.sanitizeCsvField(req.paymentMode),
        feeAmount: Number(req.feeAmount || 0).toFixed(2),
        taxAmount: Number(req.taxAmount || 0).toFixed(2),
        amountToCredit: Number(req.amountToCredit || 0).toFixed(2),
        platformProfit: Number(req.platformProfit || 0).toFixed(2),
        merchantRate: Number(req.merchantRate || 0).toFixed(2),
        feeType: this.sanitizeCsvField(req.feeType),
        currency: this.sanitizeCsvField(req.currency),
        amountInINR: Number(req.amountInINR || 0).toFixed(2),
        failureReason: this.sanitizeCsvField(req.failureReason),
        utr: utr,
        requestedAt: this.formatDate(req.requestedAt),
        completedAt: this.formatDate(req.completedAt),
        createdAt: this.formatDate(req.createdAt),
      };
    });

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   *  Generate CSV for PayOut Requests
   */
  async generatePayOutRequestsCsv(
    user,
    merchantId,
    startDate,
    endDate,
    filterOptions,
  ) {
    const where = {};

    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    //  Use requestedAt
    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = new Date(startDate);
      if (endDate) where.requestedAt.lte = new Date(endDate);
    }

    // Apply filters
    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "status":
            where.status = value;
            break;
          case "paymentMode":
            where.paymentMode = value;
            break;
          case "gatewayId":
            where.gatewayId = Number(value);
            break;
          case "merchantId":
            where.merchantId = Number(value);
            break;
          case "userId":
            where.userId = Number(value);
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
          case "search":
            where.OR = [
              { merchantReference: { contains: value, mode: "insensitive" } },
              { metadata: { path: ["utr"], string_contains: value } },
            ];
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { requestedAt: "desc" };

    const requests = await prisma.payOutRequest.findMany({
      where,
      include: {
        merchant: { select: { id: true, name: true, email: true } },
        gateway: { select: { id: true, name: true } },
      },
      orderBy,
    });

    if (requests.length === 0) return "";

    const csvData = requests.map((req) => {
      let utr = "";
      try {
        if (req.metadata) {
          const metadata =
            typeof req.metadata === "string"
              ? JSON.parse(req.metadata)
              : req.metadata;

          if (metadata.responseLog) {
            const responseLog =
              typeof metadata.responseLog === "string"
                ? JSON.parse(metadata.responseLog)
                : metadata.responseLog;
            utr =
              responseLog?.data?.payment?.utr ||
              responseLog?.data?.acquirer_data?.rrn ||
              "";
          }

          if (!utr) {
            utr =
              metadata?.utr || metadata?.rrn || metadata?.bankReference || "";
          }
        }

        if (!utr && req.responseLog) {
          const responseLog =
            typeof req.responseLog === "string"
              ? JSON.parse(req.responseLog)
              : req.responseLog;
          utr =
            responseLog?.data?.payment?.utr ||
            responseLog?.data?.acquirer_data?.rrn ||
            "";
        }
      } catch (e) {
        utr = "";
      }

      const safeDecrypt = (value) => {
        if (!value) return "";
        try {
          return decrypt(value);
        } catch {
          return value;
        }
      };

      return {
        id: req.id,
        merchantId: req.merchantId,
        merchantName: this.sanitizeCsvField(req.merchant?.name),
        gatewayName: this.sanitizeCsvField(req.gateway?.name),
        amount: Number(req.amount).toFixed(2),
        status: req.status,
        merchantReference: this.sanitizeCsvField(req.merchantReference),
        gatewayReference: this.sanitizeCsvField(req.gatewayReference),
        beneficiaryName: this.sanitizeCsvField(req.beneficiaryName),
        beneficiaryAccount: this.sanitizeCsvField(
          safeDecrypt(req.beneficiaryAccount),
        ),
        beneficiaryBank: this.sanitizeCsvField(
          safeDecrypt(req.beneficiaryBank),
        ),
        beneficiaryIfsc: this.sanitizeCsvField(
          safeDecrypt(req.beneficiaryIfsc),
        ),
        feeAmount: Number(req.feeAmount || 0).toFixed(2),
        taxAmount: Number(req.taxAmount || 0).toFixed(2),
        amountToDebit: Number(req.amountToDebit || 0).toFixed(2),
        utr: utr,
        requestedAt: this.formatDate(req.requestedAt),
        processedAt: this.formatDate(req.processedAt),
        completedAt: this.formatDate(req.completedAt),
        createdAt: this.formatDate(req.createdAt),
      };
    });

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   * Generate CSV for PayIn Wallets
   */
  async generatePayInWalletsCsv(
    user,
    merchantId,
    startDate,
    endDate,
    filterOptions,
  ) {
    const where = {};

    // Merchant filter
    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    // Date filter
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    // Apply filters from ARRAY
    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "merchantId":
            where.merchantId = value;
            break;
          case "userId":
            where.userId = value;
            break;
          case "type":
            where.type = value;
            break;
          case "transactionId":
            if (operator === "contains") {
              where.transactionId = { contains: value };
            } else {
              where.transactionId = value;
            }
            break;
          case "search":
            where.description = { contains: value, mode: "insensitive" };
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { transactionDate: "desc" };

    const wallets = await prisma.payInWallet.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, email: true } } },
      orderBy,
    });

    if (wallets.length === 0) return "";

    const csvData = wallets.map((w) => ({
      id: w.id,
      merchantId: w.merchantId,
      merchantName: this.sanitizeCsvField(w.merchant?.name),
      merchantEmail: this.sanitizeCsvField(w.merchant?.email),
      amount: Number(w.amount).toFixed(2),
      type: w.type,
      description: this.sanitizeCsvField(w.description),
      transactionId: this.sanitizeCsvField(w.transactionId),
      referenceId: this.sanitizeCsvField(w.referenceId),
      openingBalance: Number(w.openingBalance).toFixed(2),
      closingBalance: Number(w.closingBalance).toFixed(2),
      createdAt: this.formatDate(w.createdAt),
    }));

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   * Generate CSV for PayOut Wallets
   */
  async generatePayOutWalletsCsv(
    user,
    merchantId,
    startDate,
    endDate,
    filterOptions,
  ) {
    const where = {};

    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    // uses transactionDate
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    // Apply filters
    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "merchantId":
            where.merchantId = value;
            break;
          case "userId":
            where.userId = value;
            break;
          case "type":
            where.type = value;
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { transactionDate: "desc" };

    const wallets = await prisma.payOutWallet.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, email: true } } },
      orderBy,
    });

    if (wallets.length === 0) return "";

    const csvData = wallets.map((w) => ({
      id: w.id,
      merchantId: w.merchantId,
      merchantName: this.sanitizeCsvField(w.merchant?.name),
      merchantEmail: this.sanitizeCsvField(w.merchant?.email),
      amount: Number(w.amount).toFixed(2),
      type: w.type,
      description: this.sanitizeCsvField(w.description),
      transactionId: this.sanitizeCsvField(w.transactionId),
      transactionDate: this.formatDate(w.transactionDate),
      openingBalance: Number(w.openingBalance).toFixed(2),
      closingBalance: Number(w.closingBalance).toFixed(2),
      createdAt: this.formatDate(w.createdAt),
    }));

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   * Generate CSV for Settlements
   */
  async generateSettlementsCsv(user, merchantId, filterOptions) {
    const where = {};

    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    // Apply filters
    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "merchantId":
            where.merchantId = value;
            break;
          case "status":
            where.status = value;
            break;
          case "approvalStatus":
            where.approvalStatus = value;
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { createdAt: "desc" };

    const settlements = await prisma.settlement.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, email: true } } },
      orderBy,
    });

    if (settlements.length === 0) return "";

    const csvData = settlements.map((s) => ({
      id: s.id,
      merchantId: s.merchantId,
      merchantName: s.merchant?.name || "",
      merchantEmail: s.merchant?.email || "",
      amount: Number(s.amount).toFixed(2),
      status: s.status,
      approvalStatus: s.approvalStatus,
      description: s.description || "",
      fee: Number(s.fee || 0).toFixed(2),
      sourceWalletBalanceBefore: Number(
        s.sourceWalletBalanceBefore || 0,
      ).toFixed(2),
      sourceWalletBalanceAfter: Number(s.sourceWalletBalanceAfter || 0).toFixed(
        2,
      ),
      destinationWalletBalanceBefore: Number(
        s.destinationWalletBalanceBefore || 0,
      ).toFixed(2),
      destinationWalletBalanceAfter: Number(
        s.destinationWalletBalanceAfter || 0,
      ).toFixed(2),
      requestedAt: this.formatDate(s.requestedAt),
      approvedAt: this.formatDate(s.approvedAt),
      processedAt: this.formatDate(s.processedAt),
      completedAt: this.formatDate(s.completedAt),
      createdAt: this.formatDate(s.createdAt),
    }));

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   * Generate CSV for Chargebacks
   */
  async generateChargebacksCsv(user, merchantId, filterOptions) {
    const where = {};

    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      // where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "merchantId":
            where.merchantId = value;
            break;
          case "status":
            where.status = value;
            break;
          case "payInRequestId":
            where.payInRequestId = value;
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { createdAt: "desc" };

    const chargebacks = await prisma.chargeback.findMany({
      where,
      include: {
        merchant: { select: { id: true, name: true, email: true } },
        gateway: { select: { id: true, name: true } },
        payInRequest: { select: { id: true, merchantReference: true } },
      },
      orderBy,
    });

    if (chargebacks.length === 0) return "";

    const csvData = chargebacks.map((c) => ({
      id: c.id,
      merchantId: c.merchantId,
      merchantName: this.sanitizeCsvField(c.merchant?.name),
      gatewayName: this.sanitizeCsvField(c.gateway?.name),
      payInRequestId: c.payInRequestId,
      payInMerchantReference: this.sanitizeCsvField(
        c.payInRequest?.merchantReference,
      ),
      amount: Number(c.amount).toFixed(2),
      currency: c.currency,
      status: c.status,
      reason: c.reason || "",
      reasonDescription: this.sanitizeCsvField(c.reasonDescription),
      gatewayChargebackId: this.sanitizeCsvField(c.gatewayChargebackId),
      customerName: this.sanitizeCsvField(c.customerName),
      customerEmail: this.sanitizeCsvField(c.customerEmail),
      customerPhone: this.sanitizeCsvField(c.customerPhone),
      chargebackFee: Number(c.chargebackFee || 0).toFixed(2),
      merchantLiability: Number(c.merchantLiability || 0).toFixed(2),
      recoveredAmount: Number(c.recoveredAmount || 0).toFixed(2),
      initiatedAt: this.formatDate(c.initiatedAt),
      respondedAt: this.formatDate(c.respondedAt),
      resolvedAt: this.formatDate(c.resolvedAt),
      createdAt: this.formatDate(c.createdAt),
    }));

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   * Generate CSV for Refunds
   */
  async generateRefundsCsv(user, merchantId, filterOptions) {
    const where = {};

    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    // Apply filters
    if (filterOptions?.filters && Array.isArray(filterOptions.filters)) {
      for (const filter of filterOptions.filters) {
        const { property, operator, value } = filter;

        switch (property) {
          case "merchantId":
            where.merchantId = value;
            break;
          case "status":
            where.status = value;
            break;
          case "payInRequestId":
            where.payOutRequestId = value;
            break;
          case "amount":
            if (operator === "gte") {
              where.amount = { ...where.amount, gte: parseFloat(value) };
            } else if (operator === "lte") {
              where.amount = { ...where.amount, lte: parseFloat(value) };
            }
            break;
        }
      }
    }

    const orderBy = filterOptions?.sorts
      ? this.convertSortsToPrisma(filterOptions.sorts)
      : { createdAt: "desc" };

    const refunds = await prisma.refund.findMany({
      where,
      include: {
        merchant: { select: { id: true, name: true, email: true } },
        gateway: { select: { id: true, name: true } },
        payInRequest: { select: { id: true, merchantReference: true } },
      },
      orderBy,
    });

    if (refunds.length === 0) return "";

    const csvData = refunds.map((r) => ({
      id: r.id,
      merchantId: r.merchantId,
      merchantName: this.sanitizeCsvField(r.merchant?.name),
      gatewayName: this.sanitizeCsvField(r.gateway?.name),
      payInRequestId: r.payInRequestId,
      payInMerchantReference: this.sanitizeCsvField(
        r.payInRequest?.merchantReference,
      ),
      amount: Number(r.amount).toFixed(2),
      currency: r.currency,
      refundType: r.refundType,
      status: r.status,
      reason: this.sanitizeCsvField(r.reason),
      gatewayRefundId: this.sanitizeCsvField(r.gatewayRefundId),
      refundToName: this.sanitizeCsvField(r.refundToName),
      refundToAccount: this.sanitizeCsvField(r.refundToAccount),
      refundToBank: this.sanitizeCsvField(r.refundToBank),
      refundToIfsc: this.sanitizeCsvField(r.refundToIfsc),
      refundFee: Number(r.refundFee || 0).toFixed(2),
      adjustmentAmount: Number(r.adjustmentAmount || 0).toFixed(2),
      initiatedAt: this.formatDate(r.initiatedAt),
      processedAt: this.formatDate(r.processedAt),
      completedAt: this.formatDate(r.completedAt),
      createdAt: this.formatDate(r.createdAt),
    }));

    const parser = new Parser();
    return parser.parse(csvData);
  }

  /**
   * Convert filters to Prisma format (kept for backward compatibility)
   */
  convertFiltersToPrisma(filters) {
    if (!filters || !Array.isArray(filters) || filters.length === 0)
      return null;

    const result = {};
    for (const filter of filters) {
      const { property, operator, value } = filter;
      if (!property || !operator) continue;

      switch (operator) {
        case "eq":
          result[property] = { equals: value };
          break;
        case "neq":
          result[property] = { not: value };
          break;
        case "gt":
          result[property] = { gt: value };
          break;
        case "gte":
          result[property] = { gte: value };
          break;
        case "lt":
          result[property] = { lt: value };
          break;
        case "lte":
          result[property] = { lte: value };
          break;
        case "contains":
          result[property] = { contains: value };
          break;
        case "in":
          result[property] = { in: value };
          break;
        case "between":
          if (Array.isArray(value) && value.length === 2) {
            result[property] = { gte: value[0], lte: value[1] };
          }
          break;
        default:
          break;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Convert sorts to Prisma format
   */
  convertSortsToPrisma(sorts) {
    if (!sorts || !Array.isArray(sorts) || sorts.length === 0) {
      return { createdAt: "desc" };
    }

    const result = {};
    for (const sort of sorts) {
      const { property, direction } = sort;
      if (property) {
        result[property] = direction === "asc" ? "asc" : "desc";
      }
    }
    return result;
  }
}

module.exports = new CsvExportService();
