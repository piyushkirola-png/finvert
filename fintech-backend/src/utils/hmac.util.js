const crypto = require("crypto");

const generateSignature = (data, secret) => {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
};

const verifySignature = (data, secret, signature) => {
  const expectedSignature = generateSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );
};

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {
  generateSignature,
  verifySignature,
  generateSecretKey,
};
