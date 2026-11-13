import { useQuery } from "@tanstack/react-query";
import { merchantRoutingService } from "../services/merchantRoutingService";

export const merchantRoutingKeys = {
  all: ["merchantRouting"] as const,
  lists: () => [...merchantRoutingKeys.all, "list"] as const,
  list: (params?: any) => [...merchantRoutingKeys.lists(), params] as const,
  details: () => [...merchantRoutingKeys.all, "detail"] as const,
  detail: (id: number) => [...merchantRoutingKeys.details(), id] as const,
  merchants: () => [...merchantRoutingKeys.all, "merchants"] as const,
  gateways: () => [...merchantRoutingKeys.all, "gateways"] as const,
};

export const useMerchantRouting = (params?: {
  merchantId?: number;
  strategy?: string;
  status?: string;
}) =>
  useQuery({
    queryKey: merchantRoutingKeys.list(params),
    queryFn: () => merchantRoutingService.getAll(params),
  });

export const useMerchantRoutingById = (id: number) =>
  useQuery({
    queryKey: merchantRoutingKeys.detail(id),
    queryFn: () => merchantRoutingService.getById(id),
    enabled: !!id,
  });

export const useMerchantsForRouting = () =>
  useQuery({
    queryKey: merchantRoutingKeys.merchants(),
    queryFn: () => merchantRoutingService.getMerchants(),
  });

export const useGatewaysForRouting = () =>
  useQuery({
    queryKey: merchantRoutingKeys.gateways(),
    queryFn: () => merchantRoutingService.getGateways(),
  });
