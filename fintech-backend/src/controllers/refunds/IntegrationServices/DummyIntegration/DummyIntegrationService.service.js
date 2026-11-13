const axios = require("axios");

const BASE_URL = process.env.PAYOUT_MOCK_URL || "http://localhost:4100";
const SECRET = process.env.DUMMY_WEBHOOK_SECRET || "dummy-webhook-secret";

class DummyRefundIntegrationService {
  /**
   * Create refund with the gateway
   */
  async createRefund(payload) {
    try {
      const response = await axios.post(
        `${BASE_URL}/refund/create`,
        {
          gateway_reference: payload.gatewayReference,
          reference_id: payload.merchantReference,
          refund_local_id: payload.refundId,
          refund_amount: payload.amount,
          refund_note: payload.notes || "Refund initiated by admin",
        },
        { timeout: 10000 }
      );

      return {
        status: "PENDING",
        gatewayRefundId: response.data.data.gateway_refund_id,
        message: response.data.data.message,
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to create refund with Dummy"
      );
    }
  }

  /**
   * Fetch refund status
   */
  async fetchRefund(gatewayRefundId) {
    try {
      const response = await axios.get(
        `${BASE_URL}/refund/${gatewayRefundId}`,
        { timeout: 10000 }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch refund from Dummy"
      );
    }
  }
}

module.exports = new DummyRefundIntegrationService();