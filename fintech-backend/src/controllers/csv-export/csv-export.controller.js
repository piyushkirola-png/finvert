const csvExportService = require("./csv-export.service");
const fs = require("fs");
const prisma = require("../../../config/prisma");

class CsvExportController {
  /**
   * GET /api/csv/exports
   */
  async getMyExports(req, res) {
    try {
      const result = await csvExportService.getMyExports(req.user);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get exports error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Build filters array from query params
   */
  buildFiltersFromQuery(query) {
    const filters = [];
    const {
      status,
      paymentMode,
      gatewayId,
      merchantId,
      userId,
      search,
      amountMin,
      amountMax,
      feeType,
      type,
      approvalStatus,
      payInRequestId,
      payOutRequestId,
      gatewayName,
      sortBy,
      sortOrder,
    } = query;

    if (status && status !== "All" && status !== "all") {
      filters.push({ property: "status", operator: "eq", value: status });
    }
    if (paymentMode && paymentMode !== "All" && paymentMode !== "all") {
      filters.push({
        property: "paymentMode",
        operator: "eq",
        value: paymentMode,
      });
    }
    if (gatewayId) {
      filters.push({
        property: "gatewayId",
        operator: "eq",
        value: parseInt(gatewayId),
      });
    }
    if (merchantId) {
      filters.push({
        property: "merchantId",
        operator: "eq",
        value: parseInt(merchantId),
      });
    }
    if (userId) {
      filters.push({
        property: "userId",
        operator: "eq",
        value: parseInt(userId),
      });
    }
    if (search) {
      filters.push({ property: "search", operator: "contains", value: search });
    }
    if (amountMin) {
      filters.push({
        property: "amount",
        operator: "gte",
        value: parseFloat(amountMin),
      });
    }
    if (amountMax) {
      filters.push({
        property: "amount",
        operator: "lte",
        value: parseFloat(amountMax),
      });
    }
    if (feeType && feeType !== "All" && feeType !== "all") {
      filters.push({ property: "feeType", operator: "eq", value: feeType });
    }
    if (type && type !== "All" && type !== "all") {
      filters.push({ property: "type", operator: "eq", value: type });
    }
    if (
      approvalStatus &&
      approvalStatus !== "All" &&
      approvalStatus !== "all"
    ) {
      filters.push({
        property: "approvalStatus",
        operator: "eq",
        value: approvalStatus,
      });
    }
    if (payInRequestId) {
      filters.push({
        property: "payInRequestId",
        operator: "eq",
        value: parseInt(payInRequestId),
      });
    }
    if (payOutRequestId) {
      filters.push({
        property: "payOutRequestId",
        operator: "eq",
        value: parseInt(payOutRequestId),
      });
    }

    return filters.length > 0 ? filters : null;
  }

  /**
   * Build sorts from query params
   */
  buildSortsFromQuery(query) {
    const { sortBy, sortOrder } = query;
    if (sortBy) {
      return { [sortBy]: (sortOrder || "DESC").toLowerCase() };
    }
    return null;
  }

  /**
   * GET /api/csv/payin-requests
   */
  async requestPayInRequestsExport(req, res) {
    try {
      const { startDate, endDate, merchantId } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "PAYIN_REQUESTS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request PayIn export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/payout-requests
   */
  async requestPayOutRequestsExport(req, res) {
    try {
      const { startDate, endDate, merchantId } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "PAYOUT_REQUESTS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request PayOut export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/payin-wallets
   */
  async requestPayInWalletsExport(req, res) {
    try {
      const { startDate, endDate, merchantId } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "PAYIN_WALLETS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request PayIn Wallet export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/payout-wallets
   */
  async requestPayOutWalletsExport(req, res) {
    try {
      const { startDate, endDate, merchantId } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "PAYOUT_WALLETS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request PayOut Wallet export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/settlements
   */
  async requestSettlementsExport(req, res) {
    try {
      const { merchantId, startDate, endDate } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "SETTLEMENTS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request Settlements export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/chargebacks
   */
  async requestChargebacksExport(req, res) {
    try {
      const { merchantId, startDate, endDate } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "CHARGEBACKS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request Chargebacks export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/refunds
   */
  async requestRefundsExport(req, res) {
    try {
      const { merchantId, startDate, endDate } = req.query;

      const filters = this.buildFiltersFromQuery(req.query);
      const sorts = this.buildSortsFromQuery(req.query);

      const result = await csvExportService.requestCsvExport(
        req.user,
        "REFUNDS",
        {
          merchantId: req.user.merchantId || merchantId,
          startDate,
          endDate,
          filters: filters,
          sorts: sorts,
        },
      );

      res.status(202).json({
        success: true,
        message: "Export is being processed",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Request Refunds export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/csv/download/:id
   */
  async downloadExport(req, res) {
    try {
      const exportId = parseInt(req.params.id);
      if (isNaN(exportId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid export ID",
        });
      }

      const csvExport = await prisma.csvExport.findUnique({
        where: { id: exportId },
      });

      if (!csvExport) {
        return res.status(404).json({
          success: false,
          error: "Export not found",
        });
      }

      // Check authorization
      if (
        req.user.role !== "ADMIN" &&
        req.user.role !== "SUPER_ADMIN" &&
        csvExport.userId !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      if (csvExport.status !== "COMPLETED" || !csvExport.fileUrl) {
        return res.status(400).json({
          success: false,
          error: "File is not ready yet or failed to generate",
        });
      }

      if (!fs.existsSync(csvExport.fileUrl)) {
        return res.status(404).json({
          success: false,
          error: "File not found on server",
        });
      }

      let filename;
      if (req.user.role === "USER") {
        filename = `export-${exportId}.csv`;
      } else {
        const typeMap = {
          PAYIN_WALLETS: "payin-wallet",
          PAYOUT_WALLETS: "payout-wallet",
          PAYIN_REQUESTS: "payin-request",
          PAYOUT_REQUESTS: "payout-request",
          SETTLEMENTS: "settlement",
          CHARGEBACKS: "chargeback",
          REFUNDS: "refund",
        };
        const name = typeMap[csvExport.exportType] || "export";
        filename = `${name}-${exportId}.csv`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );

      const fileStream = fs.createReadStream(csvExport.fileUrl);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download export error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new CsvExportController();
