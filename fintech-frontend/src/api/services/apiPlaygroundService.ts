import api from "../../lib/api-client";

export const apiPlaygroundService = {
  createPayin: async (payload: any) => {
    const { data } = await api.post("/api-playground/payin", payload);
    return data.data;
  },
  createPayout: async (payload: any) => {
    const { data } = await api.post("/api-playground/payout", payload);
    return data.data;
  },
};
