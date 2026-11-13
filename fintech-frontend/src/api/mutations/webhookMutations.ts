import { useMutation, useQueryClient } from "@tanstack/react-query";
import { retryWebhook } from "../services/webhookService";
import { toast } from "sonner";

export const useRetryWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => retryWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outboundWebhooks"] });
      toast.success("Retry successful. Webhook delivered to merchant.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Retry failed. Merchant server is unreachable.",
      );
    },
  });
};
