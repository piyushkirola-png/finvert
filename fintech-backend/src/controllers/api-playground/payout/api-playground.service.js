const payoutRequestsService = require("../../payout-requests/payout-requests.service");

class PayoutPlaygroundService {
  async createPlaygroundPayout(payload, metadata, currentUser) {
    // Calls the exact same service as Postman/CSV
    return await payoutRequestsService.create(payload, metadata, currentUser);
  }
}

module.exports = new PayoutPlaygroundService();
