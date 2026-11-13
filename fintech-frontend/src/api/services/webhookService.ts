import api from "../../lib/api-client";
import type { InboundWebhook, OutboundWebhook } from "../../types/webhook";

export const getInboundWebhooks = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  gatewayId?: number | string;
  merchantId?: number | string;
  eventType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<InboundWebhook[]> => {
  const { data } = await api.get("/webhooks/inbound", { params });
  return data.data ?? [];
};

export const getOutboundWebhooks = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  merchantId?: number | string;
  gatewayId?: number | string;
  eventType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<OutboundWebhook[]> => {
  const { data } = await api.get("/webhooks/outbound", { params });
  return data.data ?? [];
};

export const getInboundWebhookById = async (
  id: number,
): Promise<InboundWebhook> => {
  const { data } = await api.get(`/webhooks/inbound/${id}`);
  return data.data;
};

export const getOutboundWebhookById = async (
  id: number,
): Promise<OutboundWebhook> => {
  const { data } = await api.get(`/webhooks/outbound/${id}`);
  return data.data;
};

export const retryWebhook = async (id: number): Promise<void> => {
  await api.post(`/webhooks/outbound/${id}/retry`);
};
