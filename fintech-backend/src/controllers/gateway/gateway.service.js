const prisma = require("../../../config/prisma");

// Helper function to convert service type
const convertServiceType = (type) => {
  const typeMap = {
    payin: "PAY_IN",
    payout: "PAY_OUT",
    both: "PAY_IN_PAY_OUT",
    PAY_IN: "PAY_IN",
    PAY_OUT: "PAY_OUT",
    PAY_IN_PAY_OUT: "PAY_IN_PAY_OUT",
  };
  return typeMap[type?.toLowerCase()] || "PAY_IN";
};

// CREATE
const createGateway = async (data) => {
  // Convert service type to uppercase enum value
  const serviceType = convertServiceType(data.service_type || data.serviceType);

  const gatewayData = {
    name: data.gateway_name || data.name,
    serviceType: serviceType,
    websiteUrl: data.website_url || data.websiteUrl,
    logoUrl: data.logo_url || data.logoUrl,
    contactName: data.contact_name || data.contactName,
    contactPhone: data.contact_number || data.contactPhone,
    contactEmail: data.email || data.contactEmail,
    isActive:
      data.is_active !== undefined
        ? data.is_active
        : data.isActive !== undefined
          ? data.isActive
          : true,
    config: data.config || {},
  };

  // Validate required fields
  if (!gatewayData.name) {
    throw new Error("Gateway name is required");
  }

  // Check if gateway already exists
  const existing = await prisma.gateway.findFirst({
    where: { name: gatewayData.name },
  });
  if (existing) {
    throw new Error(`Gateway with name "${gatewayData.name}" already exists`);
  }

  console.log("Creating gateway with data:", gatewayData); // Debug log

  return await prisma.gateway.create({
    data: gatewayData,
  });
};

// GET ALL
const getAllGateways = async () => {
  const gateways = await prisma.gateway.findMany({
    orderBy: { id: "desc" },
  });

  // ✅ Transform to frontend format (snake_case with lowercase service_type)
  return gateways.map((gateway) => ({
    id: gateway.id,
    gateway_name: gateway.name,
    service_type: gateway.serviceType?.toLowerCase().replace("_", ""),
    website_url: gateway.websiteUrl,
    logo_url: gateway.logoUrl,
    contact_name: gateway.contactName,
    contact_number: gateway.contactPhone,
    email: gateway.contactEmail,
    is_active: gateway.isActive,
    created_at: gateway.createdAt,
    updated_at: gateway.updatedAt,
  }));
};

// GET BY ID
const getGatewayById = async (id) => {
  const gateway = await prisma.gateway.findUnique({
    where: { id: Number(id) },
  });
  if (!gateway) throw new Error("Gateway not found");

  let serviceTypeLower = gateway.serviceType?.toLowerCase();
  if (serviceTypeLower === "pay_in") serviceTypeLower = "payin";
  if (serviceTypeLower === "pay_out") serviceTypeLower = "payout";
  if (serviceTypeLower === "pay_in_pay_out") serviceTypeLower = "both";

  return {
    id: gateway.id,
    gateway_name: gateway.name,
    service_type: serviceTypeLower,
    website_url: gateway.websiteUrl,
    logo_url: gateway.logoUrl,
    contact_name: gateway.contactName,
    contact_number: gateway.contactPhone,
    email: gateway.contactEmail,
    is_active: gateway.isActive,
    created_at: gateway.createdAt,
    updated_at: gateway.updatedAt,
  };
};

// UPDATE
const updateGateway = async (id, data) => {
  const gateway = await prisma.gateway.findUnique({
    where: { id: Number(id) },
  });
  if (!gateway) throw new Error("Gateway not found");

  const updateData = {};
  if (data.gateway_name !== undefined) updateData.name = data.gateway_name;
  if (data.service_type !== undefined)
    updateData.serviceType = convertServiceType(data.service_type);
  if (data.website_url !== undefined) updateData.websiteUrl = data.website_url;
  if (data.logo_url !== undefined) updateData.logoUrl = data.logo_url;
  if (data.contact_name !== undefined)
    updateData.contactName = data.contact_name;
  if (data.contact_number !== undefined)
    updateData.contactPhone = data.contact_number;
  if (data.email !== undefined) updateData.contactEmail = data.email;
  if (data.is_active !== undefined) updateData.isActive = data.is_active;

  return await prisma.gateway.update({
    where: { id: Number(id) },
    data: updateData,
  });
};

// DELETE
const deleteGateway = async (id) => {
  const gateway = await prisma.gateway.findUnique({
    where: { id: Number(id) },
  });
  if (!gateway) throw new Error("Gateway not found");

  return await prisma.gateway.delete({
    where: { id: Number(id) },
  });
};

module.exports = {
  createGateway,
  getAllGateways,
  getGatewayById,
  updateGateway,
  deleteGateway,
};
