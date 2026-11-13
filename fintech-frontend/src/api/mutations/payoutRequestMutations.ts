import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updatePayoutRequestStatus,
  exportPayoutRequestsCSV,
} from "../services/payoutRequestService";
import { PAYOUT_REQUEST_QUERY_KEYS } from "../queries/usePayoutRequests";
import type {
  UpdatePayoutRequestStatusPayload,
  ExportPayoutRequestFilters,
} from "../../types/payoutRequest";

export const useUpdatePayoutRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdatePayoutRequestStatusPayload;
    }) => updatePayoutRequestStatus(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PAYOUT_REQUEST_QUERY_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYOUT_REQUEST_QUERY_KEYS.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: PAYOUT_REQUEST_QUERY_KEYS.stats(),
      });
      toast.success(`Payout Request status updated to ${data.status}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update Payout Request status");
    },
  });
};

export const useExportPayoutRequests = () => {
  return useMutation({
    mutationFn: (filters: ExportPayoutRequestFilters) =>
      exportPayoutRequestsCSV(filters),
    onSuccess: () => {
      toast.success(
        "Export is being processed. You can download it from Transaction Reports.",
        { duration: 5000 },
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start export. Please try again.");
    },
  });
};
