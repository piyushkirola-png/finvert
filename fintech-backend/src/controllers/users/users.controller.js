const jwt = require("jsonwebtoken");
const UserService = require("./users.service");

const createUser = async (req, res) => {
  try {
    const user = await UserService.createUser(req.body);
    res.status(201).json({ success: true, message: "User created", user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, isActive, merchantId, search, limit, offset } = req.query;

    const users = await UserService.getAllUsers({
      role,
      isActive,
      merchantId,
      search,
      limit,
      offset,
    });

    res.status(200).json({ success: true, users });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "User updated",
      user,
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    console.log("=== DELETE REQUEST ===");
    console.log("ID:", req.params.id);

    await UserService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const removeUserFromMerchant = async (req, res) => {
  try {
    await UserService.removeUserFromMerchant(req.params.userId);
    res
      .status(200)
      .json({ success: true, message: "User removed from merchant" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCurrency = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { defaultCurrency } = req.body;
    const updated = await UserService.updateCurrency(userId, defaultCurrency);

    const newToken = jwt.sign(
      {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        merchantId: updated.merchantId,
        defaultCurrency: updated.defaultCurrency,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      user: updated,
      token: newToken,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  removeUserFromMerchant,
  updateCurrency,
};
