const CARD_NETWORKS = {
  VISA: "VISA",
  MASTERCARD: "MASTERCARD",
  RUPAY: "RUPAY",
  AMEX: "AMEX",
  DINERS: "DINERS",
  MAESTRO: "MAESTRO",
  UNIONPAY: "UNIONPAY",
  JCB: "JCB",
  DISCOVER: "DISCOVER",
};

/**
 * Detect card network from card number
 * @param {string} cardNumber - The card number
 * @returns {string} - Card network (VISA, MASTERCARD, etc.)
 */
function detectCardNetwork(cardNumber) {
  if (!cardNumber || typeof cardNumber !== "string") {
    return CARD_NETWORKS.UNKNOWN;
  }

  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, "");

  // Get first digit, first two, first four, first six
  const firstDigit = cleaned.charAt(0);
  const firstTwo = cleaned.substring(0, 2);
  const firstFour = cleaned.substring(0, 4);
  const firstSix = cleaned.substring(0, 6);

  // VISA: Starts with 4
  if (firstDigit === "4") {
    return CARD_NETWORKS.VISA;
  }

  // Mastercard: 51-55 or 2221-2720
  const firstTwoNum = parseInt(firstTwo);
  const firstFourNum = parseInt(firstFour);
  if (
    (firstTwoNum >= 51 && firstTwoNum <= 55) ||
    (firstFourNum >= 2221 && firstFourNum <= 2720)
  ) {
    return CARD_NETWORKS.MASTERCARD;
  }

  // AMEX: 34 or 37
  if (firstTwo === "34" || firstTwo === "37") {
    return CARD_NETWORKS.AMEX;
  }

  // Diners: 36, 38, 300-305
  const firstThree = parseInt(cleaned.substring(0, 3));
  if (
    firstTwo === "36" ||
    firstTwo === "38" ||
    (firstThree >= 300 && firstThree <= 305)
  ) {
    return CARD_NETWORKS.DINERS;
  }

  // Maestro: 50, 56-58, 60, 63, 67, 69
  const maestroPrefixes = ["50", "56", "57", "58", "60", "63", "67", "69"];
  if (maestroPrefixes.includes(firstTwo)) {
    return CARD_NETWORKS.MAESTRO;
  }

  // UnionPay: 62
  if (firstTwo === "62") {
    return CARD_NETWORKS.UNIONPAY;
  }

  // JCB: 35
  if (firstTwo === "35") {
    return CARD_NETWORKS.JCB;
  }

  // Rupay: 60, 61, 65, 81, 82, 83, 84, 85, 86, 87, 88, 89
  const rupayPrefixes = [
    "60",
    "61",
    "65",
    "81",
    "82",
    "83",
    "84",
    "85",
    "86",
    "87",
    "88",
    "89",
  ];
  if (rupayPrefixes.includes(firstTwo)) {
    return CARD_NETWORKS.RUPAY;
  }

  // Discover: 6011, 644-649, 65
  if (
    firstFour === "6011" ||
    firstTwo === "65" ||
    (parseInt(firstThree) >= 644 && parseInt(firstThree) <= 649)
  ) {
    return CARD_NETWORKS.DISCOVER;
  }

  return CARD_NETWORKS.UNKNOWN;
}

/**
 * Get card network with color mapping for UI
 */
function getCardNetworkColor(network) {
  const colors = {
    VISA: "bg-blue-100 text-blue-700",
    MASTERCARD: "bg-red-100 text-red-700",
    RUPAY: "bg-orange-100 text-orange-700",
    AMEX: "bg-purple-100 text-purple-700",
    DINERS: "bg-pink-100 text-pink-700",
    MAESTRO: "bg-teal-100 text-teal-700",
    UNIONPAY: "bg-green-100 text-green-700",
    JCB: "bg-yellow-100 text-yellow-700",
    DISCOVER: "bg-indigo-100 text-indigo-700",
    UNKNOWN: "bg-slate-100 text-slate-500",
  };
  return colors[network] || colors["UNKNOWN"];
}

module.exports = {
  CARD_NETWORKS,
  detectCardNetwork,
  getCardNetworkColor,
};
