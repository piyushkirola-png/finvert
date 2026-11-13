const prisma = require("../../../config/prisma");

// GET ALL INBOUND WEBHOOKS
const getInboundWebhooks = async (filters = {}) => {
  const {
    status,
    gatewayId,
    merchantId,
    eventType,
    search,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = filters;

  const where = {};

  if (status && status !== "all") where.status = status;
  if (gatewayId && gatewayId !== "all") where.gatewayId = Number(gatewayId);
  if (merchantId && merchantId !== "all") where.merchantId = Number(merchantId);
  if (eventType && eventType !== "all") where.eventType = eventType;

  if (search) {
    where.OR = [{ utr: { contains: search, mode: "insensitive" } }];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const webhooks = await prisma.inboundLog.findMany({
    where,
    select: {
      id: true,
      gatewayId: true,
      merchantId: true,
      eventType: true,
      processedAt: true,
      status: true,
      responseStatus: true,
      utr: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
      gateway: { select: { id: true, name: true } },
      merchant: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 100, 100),
    skip: Number(offset) || 0,
  });

  const total = await prisma.inboundLog.count({ where });

  return webhooks.map((item) => ({
    id: item.id,
    gatewayId: item.gatewayId,
    gatewayName: item.gateway?.name || null,
    merchantId: item.merchantId,
    merchantName: item.merchant?.name || null,
    eventType: item.eventType,
    processedAt: item.processedAt,
    status: item.status,
    responseStatus: item.responseStatus,
    utr: item.utr,
    amount: item.amount ? Number(item.amount) : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

// GET SINGLE INBOUND WEBHOOK BY ID
const getInboundWebhookById = async (id) => {
  const webhook = await prisma.inboundLog.findUnique({
    where: { id: Number(id) },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!webhook) return null;

  return {
    id: webhook.id,
    gatewayId: webhook.gatewayId,
    gatewayName: webhook.gateway?.name || null,
    merchantId: webhook.merchantId,
    merchantName: webhook.merchant?.name || null,
    eventType: webhook.eventType,
    processedAt: webhook.processedAt,
    requestBody: webhook.requestBody,
    requestHeaders: webhook.requestHeaders,
    responseBody: webhook.responseBody,
    responseHeaders: webhook.responseHeaders,
    status: webhook.status,
    responseStatus: webhook.responseStatus,
    utr: webhook.utr,
    amount: webhook.amount ? Number(webhook.amount) : null,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
};

// GET ALL OUTBOUND WEBHOOKS
const getOutboundWebhooks = async (filters = {}) => {
  const {
    status,
    merchantId,
    gatewayId,
    eventType,
    search,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = filters;

  const where = {};

  if (status && status !== "all") where.status = status;
  if (merchantId && merchantId !== "all") where.merchantId = Number(merchantId);
  if (gatewayId && gatewayId !== "all") where.gatewayId = Number(gatewayId);
  if (eventType && eventType !== "all") where.eventType = eventType;

  if (search) {
    where.OR = [{ utr: { contains: search, mode: "insensitive" } }];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const webhooks = await prisma.outboundLog.findMany({
    where,
    select: {
      id: true,
      merchantId: true,
      gatewayId: true,
      eventType: true,
      processedAt: true,
      status: true,
      amount: true,
      responseStatus: true,
      utr: true,
      createdAt: true,
      updatedAt: true,
      gateway: { select: { id: true, name: true } },
      merchant: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 100, 100),
    skip: Number(offset) || 0,
  });

  const total = await prisma.outboundLog.count({ where });

  return webhooks.map((item) => ({
    id: item.id,
    merchantId: item.merchantId,
    merchantName: item.merchant?.name || null,
    gatewayId: item.gatewayId,
    gatewayName: item.gateway?.name || null,
    eventType: item.eventType,
    processedAt: item.processedAt,
    status: item.status,
    amount: item.amount ? Number(item.amount) : 0,
    responseStatus: item.responseStatus,
    utr: item.utr,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

// GET SINGLE OUTBOUND WEBHOOK BY ID
const getOutboundWebhookById = async (id) => {
  const webhook = await prisma.outboundLog.findUnique({
    where: { id: Number(id) },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!webhook) return null;

  return {
    id: webhook.id,
    merchantId: webhook.merchantId,
    merchantName: webhook.merchant?.name || null,
    gatewayId: webhook.gatewayId,
    gatewayName: webhook.gateway?.name || null,
    eventType: webhook.eventType,
    processedAt: webhook.processedAt,
    requestBody: webhook.requestBody,
    requestHeaders: webhook.requestHeaders,
    responseBody: webhook.responseBody,
    responseHeaders: webhook.responseHeaders,
    status: webhook.status,
    amount: webhook.amount ? Number(webhook.amount) : 0,
    responseStatus: webhook.responseStatus,
    utr: webhook.utr,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
};

// RETRY FAILED OUTBOUND WEBHOOK
const retryOutboundWebhook = async (id) => {
  const webhook = await prisma.outboundLog.findUnique({
    where: { id: Number(id) },
    include: {
      merchant: true,
    },
  });

  if (!webhook) {
    throw new Error("Outbound webhook not found");
  }

  if (webhook.status !== "FAILED") {
    throw new Error("Only failed webhooks can be retried");
  }

  const axios = require("axios");

  try {
    const response = await axios.post(
      webhook.merchant.webhookUrl,
      webhook.requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    const updated = await prisma.outboundLog.update({
      where: { id: Number(id) },
      data: {
        status: "SUCCESS",
        responseStatus: response.status,
        responseBody: response.data,
        processedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      status: "SUCCESS",
      message: "Webhook retry successful",
    };
  } catch (error) {
    const status = error.response?.status || 500;
    await prisma.outboundLog.update({
      where: { id: Number(id) },
      data: {
        status: "FAILED",
        responseStatus: status,
        responseBody: error.response?.data || error.message,
        processedAt: new Date(),
      },
    });

    throw new Error(
      `Merchant webhook URL is unreachable.`,
    );
  }
};

module.exports = {
  getInboundWebhooks,
  getInboundWebhookById,
  getOutboundWebhooks,
  getOutboundWebhookById,
  retryOutboundWebhook,
};
