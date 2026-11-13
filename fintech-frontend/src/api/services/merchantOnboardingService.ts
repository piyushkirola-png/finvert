import api from "../../lib/api-client";
import type {
  MerchantOnboardingData,
  MerchantRateFormData,
  MerchantDocumentUpload,
} from "../../types/merchantOnboarding";

export const merchantOnboardingService = {
  getMerchant: async (id: string) => {
    const { data } = await api.get(`/merchants/${id}`);
    return data.data ?? data;
  },

  updateMerchant: async (
    id: string,
    payload: Partial<MerchantOnboardingData>,
  ) => {
    const { data } = await api.put(`/merchants/${id}`, payload);
    return data.data ?? data;
  },

  getDocuments: async (merchantId: string) => {
    const { data } = await api.get(`/merchant-documents/${merchantId}`);
    return data.data ?? [];
  },

  uploadDocument: async (payload: MerchantDocumentUpload) => {
    const formData = new FormData();
    formData.append("merchantId", String(payload.merchantId));
    formData.append("docType", payload.docType);
    if (payload.customName) formData.append("customName", payload.customName);
    formData.append("file", payload.file);

    const { data } = await api.post("/merchant-documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data ?? data;
  },

  deleteDocument: async (
    merchantId: string,
    docType: string,
    customName?: string,
  ) => {
    if (docType === "CUSTOM_DOCUMENT" && customName) {
      await api.delete(
        `/merchant-documents/${merchantId}/CUSTOM_DOCUMENT/${encodeURIComponent(customName)}`,
      );
    } else {
      await api.delete(`/merchant-documents/${merchantId}/${docType}`);
    }
  },

  verifyDocument: async (
    merchantId: string,
    type: string,
    customName?: string | null,
  ) => {
    await api.put(`/merchant-documents/${merchantId}/status`, {
      type,
      status: "VERIFIED",
      customName: customName ?? null,
    });
  },

  rejectDocument: async (
    merchantId: string,
    type: string,
    customName?: string | null,
  ) => {
    await api.put(`/merchant-documents/${merchantId}/status`, {
      type,
      status: "REJECTED",
      customName: customName ?? null,
    });
  },

  getRates: async (merchantId: string) => {
    const { data } = await api.get(`/merchant-rates/${merchantId}`);
    return data.data ?? [];
  },

  addRate: async (payload: MerchantRateFormData) => {
    const { data } = await api.post("/merchant-rates", payload);
    return data.data ?? data;
  },

  updateRate: async (id: number, payload: MerchantRateFormData) => {
    const { data } = await api.put(`/merchant-rates/${id}`, payload);
    return data.data ?? data;
  },

  deleteRate: async (id: number) => {
    await api.delete(`/merchant-rates/${id}`);
  },

  getGateways: async () => {
    const { data } = await api.get("/gateway");
    return data.data ?? [];
  },

  getIPWhitelist: async (merchantId: string) => {
    const { data } = await api.get(`/merchants/${merchantId}/whitelist-ips`);
    return data.data?.ips ?? [];
  },

  addIP: async (merchantId: string, ip: string) => {
    await api.post(`/merchants/${merchantId}/whitelist-ips`, { ip });
  },

  updateIP: async (merchantId: string, oldIp: string, newIp: string) => {
    await api.put(`/merchants/${merchantId}/whitelist-ips/${oldIp}`, {
      ip: newIp,
    });
  },

  deleteIP: async (merchantId: string, ip: string) => {
    await api.delete(`/merchants/${merchantId}/whitelist-ips/${ip}`);
  },
};
