import api from "../../lib/api-client";
import type {
  Merchant,
  MerchantStats,
  MerchantRegistrationData,
} from "../../types/merchant";

export const merchantService = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const { data } = await api.get("/merchants", { params });
    return data.data ?? data ?? [];
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/merchants/merchant-summary/${id}`);
    return data.data ?? data;
  },

  getStats: async () => {
    const { data } = await api.get("/merchants/stats");
    const result = data.data ?? data;
    return {
      totalMerchants: result.totalMerchants ?? 0,
      activeMerchants: result.activeMerchants ?? 0,
      pendingMerchants: result.pendingMerchants ?? 0,
    } as MerchantStats;
  },

  create: async (payload: Partial<Merchant>) => {
    const { data } = await api.post("/merchants", payload);
    return data.data ?? data;
  },

  update: async (id: number, payload: Partial<Merchant>) => {
    const { data } = await api.put(`/merchants/${id}`, payload);
    return data.data ?? data;
  },

  delete: async (id: number) => {
    await api.delete(`/merchants/${id}`);
  },

  approve: async (id: number) => {
    const { data } = await api.put(`/merchants/${id}/approve`);
    return data.data ?? data;
  },

  reject: async (id: number) => {
    const { data } = await api.put(`/merchants/${id}/reject`);
    return data.data ?? data;
  },

  assignUser: async (merchantId: number, userId: number) => {
    const { data } = await api.post("/merchants/assign-user", {
      merchantId,
      userId,
    });
    return data.data ?? data;
  },

  removeUser: async (merchantId: number, userId: number) => {
    await api.delete(`/merchants/${merchantId}/users/${userId}`);
  },

  getDocuments: async (merchantId: number) => {
    const { data } = await api.get(`/merchant-documents/${merchantId}`);
    return data.data ?? [];
  },

  getRates: async (merchantId: number) => {
    const { data } = await api.get(`/merchant-rates/${merchantId}`);
    return data.data ?? [];
  },

  getIPWhitelist: async (merchantId: number) => {
    const { data } = await api.get(`/merchants/${merchantId}/whitelist-ips`);
    return data.data?.ips ?? [];
  },

  register: async (payload: MerchantRegistrationData) => {
    const { data } = await api.post("/merchant-registration/register", payload);
    return data.data ?? data;
  },

  uploadDocument: async (
    merchantId: number,
    docType: string,
    file: File,
    customName?: string,
  ) => {
    const formData = new FormData();
    formData.append("merchantId", String(merchantId));
    formData.append("docType", docType);
    if (customName) formData.append("customName", customName);
    formData.append("file", file);

    const { data } = await api.post("/merchant-documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data ?? data;
  },
};
