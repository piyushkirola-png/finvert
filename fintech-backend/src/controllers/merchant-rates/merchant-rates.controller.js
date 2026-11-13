const merchantRatesService = require("./merchant-rates.service");

const getMerchantRates = async (req, res) => {
  try {
    const { merchantId } = req.params;

    const rates = await merchantRatesService.getMerchantRates(merchantId);

    res.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch merchant rates",
    });
  }
};

const createMerchantRate = async (req, res) => {
  try {
    const rate = await merchantRatesService.createMerchantRate(req.body);

    res.status(201).json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create merchant rate",
      error: error.message,
    });
  }
};

const updateMerchantRate = async (req, res) => {
  try {
    const { id } = req.params;
    const rate = await merchantRatesService.updateMerchantRate(id, req.body);
    res.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update merchant rate",
      error: error.message,
    });
  }
};

const deleteMerchantRate = async (req, res) => {
  try {
    const { id } = req.params;

    await merchantRatesService.deleteMerchantRate(id);

    res.json({
      success: true,
      message: "Rate deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete merchant rate",
    });
  }
};

module.exports = {
  getMerchantRates,
  createMerchantRate,
  updateMerchantRate,
  deleteMerchantRate,
};
