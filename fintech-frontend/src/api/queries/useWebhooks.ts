import { useQuery } from "@tanstack/react-query";
import {
  getInboundWebhooks,
  getOutboundWebhooks,
  getInboundWebhookById,
  getOutboundWebhookById,
} from "../services/webhookService";
import type { InboundWebhook, OutboundWebhook } from "../../types/webhook";

interface WebhookQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  gatewayId?: number | string;
  merchantId?: number | string;
  eventType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const useInboundWebhooks = (params?: WebhookQueryParams) =>
  useQuery<InboundWebhook[]>({
    queryKey: ["inboundWebhooks", params],
    queryFn: () => getInboundWebhooks(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useOutboundWebhooks = (params?: WebhookQueryParams) =>
  useQuery<OutboundWebhook[]>({
    queryKey: ["outboundWebhooks", params],
    queryFn: () => getOutboundWebhooks(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useInboundWebhookDetails = (id: number | null) =>
  useQuery<InboundWebhook>({
    queryKey: ["inboundWebhook", id],
    queryFn: () => getInboundWebhookById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useOutboundWebhookDetails = (id: number | null) =>
  useQuery<OutboundWebhook>({
    queryKey: ["outboundWebhook", id],
    queryFn: () => getOutboundWebhookById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
