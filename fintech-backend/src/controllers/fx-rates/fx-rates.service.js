const prisma = require("../../../config/prisma");
const axios = require("axios");

const FX_API_BASE_URL =
  process.env.FX_API_BASE_URL || "https://api.exchangerate-api.com/v4/latest";

class FxRatesService {
  /**
   * Fetch rates from external API and save to database
   */
  async fetchAndStoreRates() {
    try {
      const response = await axios.get(`${FX_API_BASE_URL}/INR`);
      const rates = response.data.rates;
      const now = new Date();
      const validFrom = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const validTo = new Date(validFrom.getTime() + 25 * 60 * 60 * 1000);

      // Loop through ALL currencies the API returns
      for (const [currency, rateValue] of Object.entries(rates)) {
        if (currency === "INR") continue;

        const rate = (1 / Number(rateValue)).toFixed(6);

        await prisma.currencyRate.upsert({
          where: {
            baseCurrency_quoteCurrency: {
              baseCurrency: currency,
              quoteCurrency: "INR",
            },
          },
          update: {
            rate: parseFloat(rate),
            validFrom,
            validTo,
            updatedAt: new Date(),
          },
          create: {
            baseCurrency: currency,
            quoteCurrency: "INR",
            rate: parseFloat(rate),
            source: "API",
            validFrom,
            validTo,
          },
        });
      }

      return {
        success: true,
        message: `Rates updated for ${Object.keys(rates).length - 1} currencies`,
      };
    } catch (error) {
      console.error("[FxRates] Failed to fetch rates:", error.message);
      throw error;
    }
  }

  /**
   * Get conversion rate for a specific currency to INR
   */
  async getRate(currency) {
    if (currency === "INR") return 1;

    const now = new Date();

    const rate = await prisma.currencyRate.findFirst({
      where: {
        baseCurrency: currency.toUpperCase(),
        quoteCurrency: "INR",
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!rate) {
      // Try to fetch fresh rate
      await this.fetchAndStoreRates();

      const freshRate = await prisma.currencyRate.findFirst({
        where: {
          baseCurrency: currency.toUpperCase(),
          quoteCurrency: "INR",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!freshRate) {
        throw new Error(`No exchange rate found for ${currency}`);
      }

      return Number(freshRate.rate);
    }

    return Number(rate.rate);
  }

  /**
   * Convert amount from any currency to INR
   */
  async convertToINR(amount, currency) {
    if (currency === "INR") return amount;

    const rate = await this.getRate(currency);
    return amount * rate;
  }

  /**
   * Get all latest valid rates
   */
  async getAllRates() {
    const now = new Date();

    return await prisma.currencyRate.findMany({
      where: {
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { baseCurrency: "asc" },
    });
  }
}

module.exports = new FxRatesService();
