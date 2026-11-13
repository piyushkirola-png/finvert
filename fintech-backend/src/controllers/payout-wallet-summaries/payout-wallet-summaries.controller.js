const payoutWalletSummaryService = require("./payout-wallet-summaries.service");
const prisma = require("../../../config/prisma");

const getSummary = async (req, res) => {
  try {
    const { merchantId } = req.params;
    let userId = null;

    if (
      req.user.role === "USER" &&
      req.user.merchantId !== parseInt(merchantId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied - not your merchant data",
      });
    }

    if (req.user.role === "USER") {
      userId = req.user.id;
    }

    const result = await payoutWalletSummaryService.getSummary(
      parseInt(merchantId),
      userId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getSummary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching wallet summary",
      error: error.message,
    });
  }
};

const getAllSummaries = async (req, res) => {
  try {
    const { merchantId, limit = 50 } = req.query;
    let userId = null;

    let finalMerchantId = merchantId ? parseInt(merchantId) : undefined;

    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({
          success: false,
          message: "No merchant associated with this user",
        });
      }
      finalMerchantId = req.user.merchantId;
      userId = req.user.id;
    }

    const result = await payoutWalletSummaryService.getAllSummaries({
      merchantId: finalMerchantId,
      userId: userId,
      limit: parseInt(limit),
    });

    const aliased = result.map((row) => ({
      ...row,
      totalChargesToday: row.totalChargesToday ?? row.netChargesToday ?? 0,
    }));

    res.status(200).json({
      success: true,
      data: aliased,
    });
  } catch (error) {
    console.error("Error in getAllSummaries:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching wallet summaries",
      error: error.message,
    });
  }
};

const refreshSummary = async (req, res) => {
  try {
    const { merchantId } = req.params;
    let userId = null;

    if (
      req.user.role === "USER" &&
      req.user.merchantId !== parseInt(merchantId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied - not your merchant data",
      });
    }

    if (req.user.role === "USER") {
      userId = req.user.id;
    }

    const result = await payoutWalletSummaryService.refreshSummary(
      parseInt(merchantId),
      userId,
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Summary refreshed successfully",
    });
  } catch (error) {
    console.error("Error in refreshSummary:", error);
    res.status(500).json({
      success: false,
      message: "Error refreshing summary",
      error: error.message,
    });
  }
};

const refreshAll = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { merchantId: { not: null }, role: "USER" },
      select: { id: true, merchantId: true },
    });

    const results = [];
    for (const user of users) {
      try {
        const result = await payoutWalletSummaryService.refreshSummary(
          user.merchantId,
          user.id,
        );
        results.push({
          merchantId: user.merchantId,
          userId: user.id,
          success: true,
          data: result,
        });
      } catch (error) {
        results.push({
          merchantId: user.merchantId,
          userId: user.id,
          success: false,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "All summaries refreshed successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error in refreshAll:", error);
    res.status(500).json({
      success: false,
      message: "Error refreshing all summaries",
      error: error.message,
    });
  }
};

module.exports = {
  getSummary,
  getAllSummaries,
  refreshSummary,
  refreshAll,
};
