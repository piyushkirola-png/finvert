import { useState, useMemo } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGateways } from "../../api/queries/useGateways";
import { useDeleteGateway } from "../../api/mutations/gatewayMutations";
import type { Gateway } from "../../types/gateway";
import GatewayForm from "./GatewayForm";
import GatewayTable from "./GatewayTable";
import GatewayStatsCards from "./GatewayStatsCards";
import GatewaySummary from "./GatewaySummary";
import {
  PAGE_HEADER,
  BTN_REFRESH,
  BTN_PRIMARY,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

export default function GatewayList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editGatewayId, setEditGatewayId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gatewayToDelete, setGatewayToDelete] = useState<Gateway | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewGateway, setViewGateway] = useState<Gateway | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: gateways = [], refetch, isLoading: loading } = useGateways();
  const { mutate: deleteGateway } = useDeleteGateway();

  const sortedGateways = useMemo(
    () => [...gateways].sort((a, b) => a.id - b.id),
    [gateways],
  );

  const total = sortedGateways.length;
  const paginatedGateways = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedGateways.slice(start, start + limit);
  }, [sortedGateways, page, limit]);

  const handleDeleteClick = (gateway: Gateway) => {
    setGatewayToDelete(gateway);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!gatewayToDelete) return;
    setDeleting(true);

    deleteGateway(gatewayToDelete.id, {
      onSuccess: () => {
        toast.success(
          `Gateway "${gatewayToDelete.gateway_name}" deleted successfully`,
        );
        setShowDeleteModal(false);
        setGatewayToDelete(null);
        setDeleting(false);
        refetch();
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || "Failed to delete gateway",
        );
        setDeleting(false);
      },
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshed");
  };

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Gateway Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all payment gateways
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => {
              setEditGatewayId(null);
              setIsModalOpen(true);
            }}
            className={BTN_PRIMARY}
          >
            <Plus size={16} /> Add Gateway
          </button>
        </div>
      </div>

      <GatewayStatsCards gateways={gateways} />

      <GatewayTable
        gateways={paginatedGateways}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={(l) => {
          setLimit(l);
          setPage(1);
        }}
        total={total}
        onEdit={(id) => {
          setEditGatewayId(id);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteClick}
        onView={setViewGateway}
      />

      {/* Add/Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-3xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h2 className="text-sm font-semibold text-slate-900">
                {editGatewayId ? "Edit Gateway" : "Add Gateway"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editGatewayId
                  ? "Update gateway information"
                  : "Create a new payment gateway"}
              </p>
            </div>

            <div className={MODAL_BODY}>
              <GatewayForm
                mode={editGatewayId ? "edit" : "create"}
                gatewayId={editGatewayId || undefined}
                onSuccess={() => {
                  setIsModalOpen(false);
                  setEditGatewayId(null);
                  toast.success(
                    editGatewayId
                      ? "Gateway updated successfully"
                      : "Gateway created successfully",
                  );
                  refetch();
                }}
                onCancel={() => {
                  setIsModalOpen(false);
                  setEditGatewayId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && gatewayToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-50">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete Gateway?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    {gatewayToDelete.gateway_name}
                  </span>
                  ?
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  This action cannot be undone. All gateway data will be
                  permanently removed.
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setGatewayToDelete(null);
                }}
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary modal */}
      {viewGateway && (
        <GatewaySummary
          gateway={viewGateway}
          onClose={() => setViewGateway(null)}
        />
      )}
    </div>
  );
}
