const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

if (!ENCRYPTION_KEY) {
  throw new Error("Missing ENCRYPTION_KEY in environment variables");
}

// Ensure key is 32 bytes (use SHA-256 to hash if key is provided)
const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

/**
 * Encrypts a string value
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted string (IV:encryptedData)
 */
const encrypt = (text) => {
  if (!text) return null;
  if (typeof text === "object") text = JSON.stringify(text);
  if (typeof text !== "string") return null;
  if (text.trim() === "") return null;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

/**
 * Decrypts an encrypted string
 * @param {string} encryptedText - The encrypted text (IV:encryptedData)
 * @returns {string} - Decrypted string
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  if (typeof encryptedText !== "string") return null;
  if (encryptedText.trim() === "") return null;

  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  const [ivHex, encryptedData] = encryptedText.split(":");
  if (!ivHex || !encryptedData) return null;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("❌ Decryption error:", error.message);
    return encryptedText;
  }
};

/**
 * Checks if a string is encrypted (has IV: format)
 */
const isEncrypted = (text) => {
  if (!text || typeof text !== "string") return false;
  return text.includes(":") && text.length > 40;
};

/**
 * Encrypts an array of IPs
 */
const encryptIpList = (ips) => {
  if (!ips || !Array.isArray(ips) || ips.length === 0) return [];
  return ips.map((ip) => encrypt(ip)).filter((encrypted) => encrypted !== null); // ← FILTER NULLS
};

/**
 * Decrypts an array of IPs
 */
const decryptIpList = (ips) => {
  if (!ips || !Array.isArray(ips) || ips.length === 0) return [];
  return ips.map((ip) => decrypt(ip)).filter((decrypted) => decrypted !== null); // ← FILTER NULLS
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptIpList,
  decryptIpList,
};
