import api from "../../lib/api-client";
import type {
  GatewayMapping,
  GatewayMappingFormData,
  Gateway,
  Merchant,
  GatewayMappingFilters,
} from "../../types/gatewayMerchantMapping";

export const gatewayMerchantMappingService = {
  getAll: async (params?: GatewayMappingFilters) => {
    const { data } = await api.get("/gateway-merchant-mappings", { params });
    return (data.data?.data ?? data.data ?? []) as GatewayMapping[];
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/gateway-merchant-mappings/${id}`);
    return (data.data ?? data) as GatewayMapping;
  },

  create: async (payload: GatewayMappingFormData) => {
    const { data } = await api.post("/gateway-merchant-mappings", payload);
    return (data.data ?? data) as GatewayMapping;
  },

  update: async (id: number, payload: { status: string }) => {
    const { data } = await api.patch(
      `/gateway-merchant-mappings/${id}`,
      payload,
    );
    return (data.data ?? data) as GatewayMapping;
  },

  delete: async (id: number) => {
    await api.delete(`/gateway-merchant-mappings/${id}`);
  },

  getGateways: async () => {
    const { data } = await api.get("/gateway");
    return (data.data ?? data ?? []) as Gateway[];
  },

  getMerchants: async () => {
    const { data } = await api.get("/merchants");
    return (data.data ?? data ?? []) as Merchant[];
  },
};
