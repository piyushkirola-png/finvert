import api from "../../lib/api-client";
import type {
  MerchantRouting,
  MerchantRoutingFormData,
  Merchant,
  Gateway,
} from "../../types/merchantRouting";

export const merchantRoutingService = {
  getAll: async (params?: {
    merchantId?: number;
    strategy?: string;
    status?: string;
  }) => {
    const { data } = await api.get("/merchant-routing", { params });
    return (data.data ?? data ?? []) as MerchantRouting[];
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/merchant-routing/${id}`);
    return (data.data ?? data) as MerchantRouting;
  },

  create: async (payload: MerchantRoutingFormData) => {
    const { data } = await api.post("/merchant-routing", payload);
    return (data.data ?? data) as MerchantRouting;
  },

  update: async (id: number, payload: MerchantRoutingFormData) => {
    const { data } = await api.put(`/merchant-routing/${id}`, payload);
    return (data.data ?? data) as MerchantRouting;
  },

  delete: async (id: number) => {
    await api.delete(`/merchant-routing/${id}`);
  },

  getMerchants: async () => {
    const { data } = await api.get("/merchants");
    return (data.data ?? data ?? []) as Merchant[];
  },

  getGateways: async () => {
    const { data } = await api.get("/gateway");
    return (data.data ?? data ?? []) as Gateway[];
  },
};
