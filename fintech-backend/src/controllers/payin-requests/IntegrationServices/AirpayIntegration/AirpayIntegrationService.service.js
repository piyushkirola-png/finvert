const axios = require("axios");
const crypto = require("crypto");
const { PayInRequestStatus } = require("@prisma/client");

class AirpayPayinIntegrationService {
  constructor() {
    this.baseUrl = process.env.AIRPAY_BASE_URL || "https://kraken.airpay.co.in";
    this.merchantId = process.env.AIRPAY_MERCHANT_ID;
    this.username = process.env.AIRPAY_USERNAME;
    this.password = process.env.AIRPAY_PASSWORD;
    this.secret = process.env.AIRPAY_SECRET;
    this.secretKey = process.env.AIRPAY_SECRET_KEY;
    this.accessToken = process.env.AIRPAY_ACCESS_TOKEN; // If static
    this.timeoutMs = Number(process.env.AIRPAY_TIMEOUT_MS || 30000);
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  // ============================================================
  // TODO: REPLACE THESE TWO FUNCTIONS WITH AIRPAY'S EXACT LOGIC
  // ============================================================
  _encryptData(data) {
    // Airpay uses a custom AES encryption. 
    // Paste their exact Node.js encryption logic here.
    // Example: return crypto.createCipheriv(...)
    console.log("[Airpay] Using stub encryption");
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }

  _generateChecksum(data) {
    // Airpay uses a custom checksum algorithm (often CRC32 or SHA256 of specific fields).
    // Paste their exact Node.js checksum logic here.
    // Example: return crypto.createHash('sha256').update(...).digest('hex')
    console.log("[Airpay] Using stub checksum");
    return "STUB_CHECKSUM"; 
  }
  // ============================================================

  async initiatePayInRequest(amount, merchantReference, customer, paymentMode, currency) {
    console.log(`[Airpay Payin] Initiate: amount=${amount}, ref=${merchantReference}, mode=${paymentMode}`);

    // Airpay only supports UPI for this endpoint
    if (paymentMode !== "UPI" && paymentMode !== "UPI_INTENT") {
      throw new Error("Airpay only supports UPI_INTENT for this endpoint.");
    }

    const requestData = {
      orderid: merchantReference,
      amount: Number(amount).toFixed(2),
      buyer_email: customer.email || "customer@example.com",
      buyer_phone: customer.phone || "9999999999",
      call_type: "upiqr",
      customer_consent: "Y",
    };

    const privateKey = crypto
      .createHash("sha256")
      .update(`${this.secret}@${this.username}:|:${this.password}`)
      .digest("hex");

    const encdata = this._encryptData(requestData);
    const checksum = this._generateChecksum(requestData);

    const payload = {
      merchant_id: this.merchantId,
      encdata: encdata,
      checksum: checksum,
      privatekey: privateKey,
    };

    const url = `${this.baseUrl}/airpay/pay/v4/api/generateorder/?token=${this.accessToken}`;

    try {
      const response = await axios.post(url, payload, {
        headers: this.getHeaders(),
        timeout: this.timeoutMs,
      });

      const data = response.data;
      
      if (data.status_code !== "200" || data.status !== "Success") {
        return {
          status: PayInRequestStatus.FAILED,
          failureReason: data.message || "Airpay generation failed",
          failureCode: data.response_code || "GATEWAY_ERROR",
          vendorResponse: data,
        };
      }

      return {
        status: PayInRequestStatus.PENDING,
        vendorReference: data.data.ap_transactionid,
        intent: data.data.qrcode_string, // The UPI string
        intentUrl: data.data.qrcode_string,
        vendorResponse: data,
        failureReason: null,
        failureCode: null,
        metadata: {
          qrcode_string: data.data.qrcode_string,
          ap_transactionid: data.data.ap_transactionid,
          rawResponse: data,
        },
      };

    } catch (error) {
      console.error("[Airpay Payin] Error:", error.message);
      return {
        status: PayInRequestStatus.FAILED,
        failureReason: error.response?.data?.message || error.message,
        failureCode: "GATEWAY_ERROR",
        vendorResponse: error.response?.data || null,
      };
    }
  }

  async checkStatus(orderId) {
    try {
      // Airpay status check usually requires the ap_transactionid.
      // Implement if needed.
      return { success: false, error: "Airpay status check not implemented" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AirpayPayinIntegrationService();