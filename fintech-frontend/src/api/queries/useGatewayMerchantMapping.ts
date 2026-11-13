import { useQuery } from "@tanstack/react-query";
import { gatewayMerchantMappingService } from "../services/gatewayMerchantMappingService";
import type { GatewayMappingFilters } from "../../types/gatewayMerchantMapping";

export const gatewayMappingKeys = {
  all: ["gatewayMerchantMappings"] as const,
  lists: () => [...gatewayMappingKeys.all, "list"] as const,
  list: (params?: GatewayMappingFilters) =>
    [...gatewayMappingKeys.lists(), params] as const,
  details: () => [...gatewayMappingKeys.all, "detail"] as const,
  detail: (id: number) => [...gatewayMappingKeys.details(), id] as const,
  gateways: () => [...gatewayMappingKeys.all, "gateways"] as const,
  merchants: () => [...gatewayMappingKeys.all, "merchants"] as const,
};

export const useGatewayMappings = (params?: GatewayMappingFilters) =>
  useQuery({
    queryKey: gatewayMappingKeys.list(params),
    queryFn: () => gatewayMerchantMappingService.getAll(params),
  });

export const useGatewayMappingById = (id: number) =>
  useQuery({
    queryKey: gatewayMappingKeys.detail(id),
    queryFn: () => gatewayMerchantMappingService.getById(id),
    enabled: !!id,
  });

export const useGatewaysForMapping = () =>
  useQuery({
    queryKey: gatewayMappingKeys.gateways(),
    queryFn: () => gatewayMerchantMappingService.getGateways(),
  });

export const useMerchantsForMapping = () =>
  useQuery({
    queryKey: gatewayMappingKeys.merchants(),
    queryFn: () => gatewayMerchantMappingService.getMerchants(),
  });
