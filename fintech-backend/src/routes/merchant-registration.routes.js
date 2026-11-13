const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/merchant-registration/merchant-registration.controller");

router.post("/register", registrationController.register);
router.get("/validate/:token", registrationController.validateToken);

module.exports = router;
