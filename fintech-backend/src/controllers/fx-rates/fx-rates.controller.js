const fxRatesService = require("./fx-rates.service");

/**
 * Fetch latest rates from API and store in DB
 */
const fetchRates = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const result = await fxRatesService.fetchAndStoreRates();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Fetch rates error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all latest rates
 */
const getAllRates = async (req, res) => {
  try {
    const rates = await fxRatesService.getAllRates();
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error("Get rates error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Convert amount
 */
const convertCurrency = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res
        .status(400)
        .json({ success: false, error: "Amount and currency are required" });
    }

    const rate = await fxRatesService.getRate(currency);
    const convertedAmount = await fxRatesService.convertToINR(amount, currency);

    res.json({
      success: true,
      data: {
        amount,
        currency: currency.toUpperCase(),
        rate,
        convertedAmount,
        convertedCurrency: "INR",
      },
    });
  } catch (error) {
    console.error("Convert currency error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  fetchRates,
  getAllRates,
  convertCurrency,
};
