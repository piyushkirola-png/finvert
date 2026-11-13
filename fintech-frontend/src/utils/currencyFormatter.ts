export function formatCurrencyAxis(value: number): string {
  if (value === 0) return "₹0";
  if (value < 0) return "-₹" + formatCurrencyAxis(Math.abs(value));
  const crore = value / 10000000;
  if (crore >= 10000) return "₹" + (crore / 1000).toFixed(1) + "K Cr";
  if (crore >= 100) return "₹" + Math.round(crore) + " Cr";
  if (crore >= 1) return "₹" + crore.toFixed(1) + " Cr";
  const lakh = value / 100000;
  if (lakh >= 1) return "₹" + lakh.toFixed(1) + " L";
  const thousand = value / 1000;
  if (thousand >= 1) return "₹" + thousand.toFixed(0) + " K";
  return "₹" + Math.round(value);
}

export function formatCurrencyAxisWithSymbol(
  value: number,
  currencySymbol = "₹",
): string {
  if (value === 0) return currencySymbol + "0";
  if (value < 0)
    return "-" + formatCurrencyAxisWithSymbol(Math.abs(value), currencySymbol);
  const crore = value / 10000000;
  if (crore >= 10000)
    return currencySymbol + (crore / 1000).toFixed(1) + "K Cr";
  if (crore >= 100) return currencySymbol + Math.round(crore) + " Cr";
  if (crore >= 1) return currencySymbol + crore.toFixed(1) + " Cr";
  const lakh = value / 100000;
  if (lakh >= 1) return currencySymbol + lakh.toFixed(1) + " L";
  const thousand = value / 1000;
  if (thousand >= 1) return currencySymbol + thousand.toFixed(0) + " K";
  return currencySymbol + Math.round(value);
}
