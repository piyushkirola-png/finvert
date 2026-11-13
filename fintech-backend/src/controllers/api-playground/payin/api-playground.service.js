const payInRequestsService = require("../../payin-requests/payin-requests.service");

class PayinPlaygroundService {
  async createPlaygroundPayin(payload, metadata, currentUser) {
    // Calls the exact same service as Postman/CSV
    return await payInRequestsService.create(payload, metadata, currentUser);
  }
}

module.exports = new PayinPlaygroundService();