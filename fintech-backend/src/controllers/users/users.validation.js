const createUserValidation = (req, res, next) => {
  const { fullName, email, phoneNumber, password } = req.body;

  if (!fullName || !email || !password || !phoneNumber) {
    return res.status(400).json({
      success: false,
      message: "Full name, email, phone number, and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  if (!email.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  next();
};

const updateUserValidation = (req, res, next) => {
  const { email } = req.body;
  if (email && !email.includes("@")) {
    return res.status(400).json({ success: false, message: "Invalid email" });
  }
  next();
};

module.exports = { createUserValidation, updateUserValidation };
