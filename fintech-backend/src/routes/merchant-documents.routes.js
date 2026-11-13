const express = require("express");
const router = express.Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const controller = require("../controllers/merchant-documents/merchant-documents.controller");

router.post("/", upload.single("file"), controller.uploadDocument);
router.get("/:merchantId", controller.getDocumentsByMerchant);
router.put("/:merchantId/status", controller.updateDocumentStatus);
router.delete("/:merchantId/:type/:customName", controller.deleteDocument);
router.delete("/:merchantId/:type", controller.deleteDocument);

module.exports = router;
