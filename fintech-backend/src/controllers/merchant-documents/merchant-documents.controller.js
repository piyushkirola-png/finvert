const service = require("./merchant-documents.service");
const fs = require("fs");
const path = require("path");

// UPLOAD / UPDATE
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "File buffer is missing",
      });
    }

    const uploadDir = path.join(
      __dirname,
      "../../../uploads/merchant-documents",
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    const fileUrl = `${process.env.BACKEND_URL}/uploads/merchant-documents/${fileName}`;
    const { merchantId, docType, customName } = req.body;
    const parsedMerchantId = parseInt(merchantId);

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: "merchantId is required",
      });
    }

    const document = await service.uploadDocument({
      merchantId: parsedMerchantId,
      type: docType,
      customName: customName || null,
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL DOCUMENTS
const getDocumentsByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const docs = await service.getDocumentsByMerchant(merchantId);
    return res.status(200).json({
      success: true,
      data: docs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// STATUS UPDATE
const updateDocumentStatus = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { type, status, customName } = req.body;
    const updated = await service.updateDocumentStatus(
      merchantId,
      type,
      status,
      customName,
    );
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE DOCUMENT
const deleteDocument = async (req, res) => {
  try {
    const { merchantId, type, customName } = req.params;

    // If customName is "null" string, convert to null
    const finalCustomName = customName === "null" ? null : customName;

    const result = await service.deleteDocument(
      merchantId,
      type,
      finalCustomName,
    );

    return res.status(200).json({
      success: true,
      message: "Document deleted",
      data: result,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByMerchant,
  updateDocumentStatus,
  deleteDocument,
};
