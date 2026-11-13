const axios = require("axios");

const BASE_URL = process.env.PAYOUT_MOCK_URL || "http://localhost:4100";
const SECRET = process.env.DUMMY_WEBHOOK_SECRET || "dummy-webhook-secret";

class DummyChargebackIntegrationService {
  /**
   * Accept dispute (Admin clicks APPROVED)
   */
  async acceptDispute(gatewayChargebackId) {
    try {
      const response = await axios.post(
        `${BASE_URL}/chargeback/${gatewayChargebackId}/accept`,
        {},
        { timeout: 10000 }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to accept dispute with Dummy"
      );
    }
  }

  /**
   * Contest dispute (Admin clicks REJECTED)
   */
  async contestDispute(gatewayChargebackId, evidenceData) {
    try {
      const response = await axios.post(
        `${BASE_URL}/chargeback/${gatewayChargebackId}/contest`,
        { evidence: evidenceData || {} },
        { timeout: 10000 }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to contest dispute with Dummy"
      );
    }
  }

  /**
   * Fetch dispute status
   */
  async fetchDispute(gatewayChargebackId) {
    try {
      const response = await axios.get(
        `${BASE_URL}/chargeback/${gatewayChargebackId}`,
        { timeout: 10000 }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch dispute from Dummy"
      );
    }
  }
}

module.exports = new DummyChargebackIntegrationService();