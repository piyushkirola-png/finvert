import { useState, useMemo } from "react";
import { Plus, RefreshCw, Filter, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useMerchantRouting,
  useMerchantsForRouting,
  useGatewaysForRouting,
} from "../../api/queries/useMerchantRouting";
import { useDeleteMerchantRouting } from "../../api/mutations/merchantRoutingMutations";
import type { MerchantRouting } from "../../types/merchantRouting";
import MerchantRoutingFilters, {
  type RoutingFilterValues,
} from "./MerchantRoutingFilters";
import MerchantRoutingTable from "./MerchantRoutingTable";
import MerchantRoutingForm from "./MerchantRoutingForm";
import MerchantRoutingDetails from "./MerchantRoutingDetails";
import {
  PAGE_HEADER,
  BTN_FILTER,
  BTN_REFRESH,
  BTN_PRIMARY,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

const DEFAULT_FILTERS: RoutingFilterValues = {
  merchantId: "all",
  strategy: "all",
  status: "all",
};

export default function MerchantRoutingPage() {
  const [filters, setFilters] = useState<RoutingFilterValues>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRouting, setEditingRouting] = useState<MerchantRouting | null>(
    null,
  );
  const [viewingRouting, setViewingRouting] = useState<MerchantRouting | null>(
    null,
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [routingToDelete, setRoutingToDelete] =
    useState<MerchantRouting | null>(null);

  const {
    data: routingList = [],
    refetch: refetchRouting,
    isLoading: routingLoading,
  } = useMerchantRouting();
  const { data: merchants = [], isLoading: merchantsLoading } =
    useMerchantsForRouting();
  const { data: gateways = [], isLoading: gatewaysLoading } =
    useGatewaysForRouting();
  const { mutate: deleteRouting, isPending: isDeleting } =
    useDeleteMerchantRouting();

  const loading = routingLoading || merchantsLoading || gatewaysLoading;

  const strategies = useMemo(
    () => [...new Set(routingList.map((item) => item.routingStrategy))],
    [routingList],
  );

  const filteredRouting = useMemo(() => {
    return routingList.filter((item) => {
      if (
        filters.merchantId !== "all" &&
        item.merchantId !== filters.merchantId
      )
        return false;
      if (
        filters.strategy !== "all" &&
        item.routingStrategy !== filters.strategy
      )
        return false;
      if (filters.status !== "all") {
        const match =
          filters.status === "ACTIVE" ? item.isActive : !item.isActive;
        if (!match) return false;
      }
      return true;
    });
  }, [routingList, filters]);

  const total = filteredRouting.length;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRouting.slice(start, start + limit);
  }, [filteredRouting, page, limit]);

  const handleRefresh = () => {
    refetchRouting();
    toast.success("Refreshed");
  };

  const handleDeleteClick = (routing: MerchantRouting) => {
    setRoutingToDelete(routing);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!routingToDelete) return;
    deleteRouting(routingToDelete.id, {
      onSuccess: () => {
        toast.success("Routing configuration deleted");
        setShowDeleteModal(false);
        setRoutingToDelete(null);
        refetchRouting();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Merchant Routing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure gateway routing strategies for each merchant
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            data-filter-toggle
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            className={BTN_FILTER}
          >
            <Filter size={16} /> Filter
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={BTN_REFRESH}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingRouting(null);
              setIsModalOpen(true);
            }}
            className={BTN_PRIMARY}
          >
            <Plus size={16} /> Add Routing
          </button>

          {isFiltersVisible && (
            <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] w-[720px]">
              <MerchantRoutingFilters
                filters={filters}
                setFilters={setFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
                merchants={merchants}
                strategies={strategies}
              />
            </div>
          )}
        </div>
      </div>

      <MerchantRoutingTable
        data={paginatedData}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={(l) => {
          setLimit(l);
          setPage(1);
        }}
        total={total}
        onView={(r) => setViewingRouting(r)}
        onEdit={(r) => {
          setEditingRouting(r);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteClick}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-4xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h2 className="text-sm font-semibold text-slate-900">
                {editingRouting
                  ? "Edit Routing Configuration"
                  : "Add Routing Configuration"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up gateway routing rules for the merchant
              </p>
            </div>
            <div className={MODAL_BODY}>
              <MerchantRoutingForm
                routing={editingRouting}
                onClose={() => {
                  setIsModalOpen(false);
                  setEditingRouting(null);
                }}
                onSuccess={() => {
                  setIsModalOpen(false);
                  setEditingRouting(null);
                  refetchRouting();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {viewingRouting && (
        <MerchantRoutingDetails
          routing={viewingRouting}
          gateways={gateways}
          onClose={() => setViewingRouting(null)}
        />
      )}

      {showDeleteModal && routingToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-50">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete Routing Configuration?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete routing for{" "}
                  <span className="font-semibold text-slate-900">
                    {routingToDelete.merchantName ||
                      `Merchant #${routingToDelete.merchantId}`}
                  </span>
                  ?
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRoutingToDelete(null);
                }}
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
