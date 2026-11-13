import { useQuery } from "@tanstack/react-query";
import { getGateways, getGatewayById } from "../services/gatewayService";
import type { Gateway } from "../../types/gateway";

export const useGateways = () =>
  useQuery<Gateway[]>({
    queryKey: ["gateways"],
    queryFn: getGateways,
  });

export const useGateway = (id: number) =>
  useQuery<Gateway>({
    queryKey: ["gateways", id],
    queryFn: () => getGatewayById(id),
    enabled: !!id,
  });
