const merchantRegistrationService = require("./merchant-registration.service");

// REGISTER MERCHANT
const register = async (req, res) => {
  try {
    const merchant = await merchantRegistrationService.registerMerchant(
      req.body,
    );

    await notificationService.notifyMerchantRegistrationPending(merchant.id);

    return res.status(201).json({
      success: true,
      message:
        "Registration submitted successfully! Your application is under review.",
      data: {
        id: merchant.id,
        merchantName: merchant.name,
        email: merchant.email,
        status: merchant.status,
        onboardingToken: merchant.onboardingToken,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// VALIDATE ONBOARDING TOKEN
const validateToken = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await merchantRegistrationService.validateToken(token);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  validateToken,
};
