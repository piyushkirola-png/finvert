const prisma = require("../../../config/prisma");

// UPLOAD DOCUMENT (CREATE / UPDATE)
const uploadDocument = async (data) => {
  const merchantId = Number(data.merchantId);
  const type = data.type;
  const customName = data.customName;

  if (!merchantId || !type) {
    throw new Error("merchantId or type missing");
  }

  // For custom documents, we need to find by type AND customName
  let existing = null;

  if (type === "CUSTOM_DOCUMENT" && customName) {
    existing = await prisma.merchantDocument.findFirst({
      where: {
        merchantId,
        type: "CUSTOM_DOCUMENT",
        customName: customName,
      },
    });
  } else {
    // Use findFirst instead of findUnique
    existing = await prisma.merchantDocument.findFirst({
      where: {
        merchantId,
        type,
        customName: null,
      },
    });
  }

  const payload = {
    merchantId,
    type,
    customName: customName || null,
    fileUrl: data.fileUrl,
    fileName: data.fileName || null,
    fileType: data.fileType || null,
    status: "PENDING",
  };

  if (existing) {
    // Update existing document
    return prisma.merchantDocument.update({
      where: {
        id: existing.id,
      },
      data: payload,
    });
  }

  // Create new document
  return prisma.merchantDocument.create({
    data: payload,
  });
};

// GET DOCUMENTS
const getDocumentsByMerchant = async (merchantId) => {
  const docs = await prisma.merchantDocument.findMany({
    where: {
      merchantId: Number(merchantId),
    },
  });

  return docs;
};

// UPDATE STATUS
const updateDocumentStatus = async (
  merchantId,
  type,
  status,
  customName = null,
) => {
  const whereClause = customName
    ? {
        merchantId: Number(merchantId),
        type,
        customName,
      }
    : {
        merchantId: Number(merchantId),
        type,
        customName: null,
      };

  const document = await prisma.merchantDocument.findFirst({
    where: whereClause,
  });

  if (!document) {
    throw new Error("Document not found");
  }

  return prisma.merchantDocument.update({
    where: { id: document.id },
    data: { status },
  });
};

// DELETE DOCUMENT
const deleteDocument = async (merchantId, type, customName = null) => {
  const whereClause = customName
    ? {
        merchantId: Number(merchantId),
        type,
        customName: customName,
      }
    : {
        merchantId: Number(merchantId),
        type,
        customName: null,
      };

  const document = await prisma.merchantDocument.findFirst({
    where: whereClause,
  });

  if (!document) {
    throw new Error("Document not found");
  }

  return prisma.merchantDocument.delete({
    where: { id: document.id },
  });
};

module.exports = {
  uploadDocument,
  getDocumentsByMerchant,
  updateDocumentStatus,
  deleteDocument,
};
