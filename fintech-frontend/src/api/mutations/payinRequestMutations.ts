import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updatePayInRequestStatus,
  exportPayInRequestsCSV,
} from "../services/payinRequestService";
import { PAYIN_REQUEST_QUERY_KEYS } from "../queries/usePayinRequests";
import type {
  UpdatePayInRequestStatusPayload,
  ExportPayInRequestFilters,
} from "../../types/payinRequest";

export const useUpdatePayInRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdatePayInRequestStatusPayload;
    }) => updatePayInRequestStatus(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PAYIN_REQUEST_QUERY_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_REQUEST_QUERY_KEYS.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: PAYIN_REQUEST_QUERY_KEYS.stats(),
      });
      toast.success(`PayIn Request status updated to ${data.status}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update PayIn Request status");
    },
  });
};

export const useExportPayInRequests = () => {
  return useMutation({
    mutationFn: (filters: ExportPayInRequestFilters) =>
      exportPayInRequestsCSV(filters),
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
