import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../components/context/AuthContext";
import {
  PAYOUT_BULK_UPLOAD_QUERY_KEYS,
  usePayoutBulkUploadHistory,
} from "../../api/queries/usePayoutBulkUpload";
import BulkUploadTable from "./BulkUploadTable";
import BulkUploadStats from "./BulkUploadStats";
import BulkUploadForm from "./BulkUploadForm";
import BulkUploadFilters, {
  type BulkUploadFiltersState,
} from "./BulkUploadFilters";
import { PAGE_HEADER, BTN_REFRESH, CARD } from "../../lib/styles";

const EMPTY_FILTERS: BulkUploadFiltersState = {
  status: "ALL",
  mode: "ALL",
  merchantId: "ALL",
  userId: "ALL",
};

export default function BulkUpload() {
  const { role, user } = useAuth();
  const isAdmin = role === "ADMIN";

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BulkUploadFiltersState>(EMPTY_FILTERS);
  const [isPremium, setIsPremium] = useState(true);
  const [premiumChecked, setPremiumChecked] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setIsPremium(true);
      setPremiumChecked(true);
      return;
    }
    const planType = (user as any)?.planType ?? "BASIC";
    setIsPremium(planType === "PREMIUM");
    setPremiumChecked(true);
  }, [isAdmin, user]);

  const { data: optionsSource } = usePayoutBulkUploadHistory(
    { offset: 0, limit: isAdmin ? 100 : 1, status: "ALL" },
    isAdmin,
  );

  const { merchantOptions, userOptions } = useMemo(() => {
    if (!isAdmin) return { merchantOptions: [], userOptions: [] };
    const m = new Map<string, string>();
    const u = new Map<string, string>();
    ((optionsSource?.data || []) as any[]).forEach((r) => {
      const mid = r.merchantId ?? r.merchant?.id;
      if (mid != null)
        m.set(String(mid), r.merchant?.name || `Merchant ${mid}`);
      const uid = r.userId ?? r.user?.id;
      if (uid != null)
        u.set(String(uid), r.user?.fullName || r.user?.email || `User ${uid}`);
    });
    return {
      merchantOptions: [...m].map(([id, label]) => ({ id, label })),
      userOptions: [...u].map(([id, label]) => ({ id, label })),
    };
  }, [optionsSource, isAdmin]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: PAYOUT_BULK_UPLOAD_QUERY_KEYS.all,
    });
    toast.success("Refreshed successfully");
  };

  if (!premiumChecked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAdmin && !isPremium) {
    return (
      <div className={`${CARD} p-10 text-center`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">
          Premium Access Required
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          Payout bulk upload is available for PREMIUM merchants only. Please
          upgrade your plan to view payout uploads.
        </p>
        <button
          onClick={() => (window.location.href = "/profile")}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
        >
          Upgrade Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Payout Bulk Upload
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Monitor payout bulk uploads across all merchants."
              : "Upload large transaction batches and track their processing status.."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <BulkUploadFilters
            filters={filters}
            onApply={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            isAdmin={isAdmin}
            merchants={merchantOptions}
            users={userOptions}
          />

          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>

          {!isAdmin && (
            <button
              onClick={() => setShowUploadDialog(true)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
            >
              <Plus size={16} /> Add Upload
            </button>
          )}
        </div>
      </div>

      <BulkUploadStats statusFilter={filters.status} isAdmin={isAdmin} />
      <BulkUploadTable filters={filters} isAdmin={isAdmin} />

      {!isAdmin && showUploadDialog && (
        <BulkUploadForm
          onSubmitted={() => setShowUploadDialog(false)}
          onClose={() => setShowUploadDialog(false)}
        />
      )}
    </div>
  );
}
