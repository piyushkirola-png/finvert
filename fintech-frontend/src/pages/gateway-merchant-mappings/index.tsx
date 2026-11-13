import { useEffect, useState, useMemo } from "react";
import { Plus, RefreshCw, Filter, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGatewayMappings,
  useGatewaysForMapping,
  useMerchantsForMapping,
} from "../../api/queries/useGatewayMerchantMapping";
import {
  useCreateGatewayMapping,
  useUpdateGatewayMapping,
  useDeleteGatewayMapping,
} from "../../api/mutations/gatewayMerchantMappingMutations";
import GatewayMerchantFilters, {
  type MappingFilterValues,
} from "./GatewayMerchantFilters";
import GatewayMerchantTable from "./GatewayMerchantTable";
import GatewayMerchantForm from "./GatewayMerchantForm";
import type {
  GatewayMapping,
  Gateway,
  Merchant,
} from "../../types/gatewayMerchantMapping";
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

const DEFAULT_FILTERS: MappingFilterValues = {
  merchantId: "all",
  gatewayId: "all",
  status: "all",
};

export default function GatewayMappings() {
  const [filters, setFilters] = useState<MappingFilterValues>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedMapping, setSelectedMapping] = useState<GatewayMapping | null>(
    null,
  );
  const [mappingToDelete, setMappingToDelete] = useState<GatewayMapping | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // ========== QUERIES ==========
  const {
    data: apiMappings = [],
    isLoading: loading,
    refetch: refetchMappings,
  } = useGatewayMappings({
    merchantId: filters.merchantId === "all" ? undefined : filters.merchantId,
    gatewayId: filters.gatewayId === "all" ? undefined : filters.gatewayId,
    status: filters.status === "all" ? undefined : filters.status,
  });
  const { data: apiGateways = [] } = useGatewaysForMapping();
  const { data: apiMerchants = [] } = useMerchantsForMapping();

  // ========== MUTATIONS ==========
  const { mutate: createMapping, isPending: isCreating } =
    useCreateGatewayMapping();
  const { mutate: updateMapping, isPending: isUpdating } =
    useUpdateGatewayMapping();
  const { mutate: deleteMapping, isPending: isDeleting } =
    useDeleteGatewayMapping();

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Client-side refine for safety
  const refinedMappings = useMemo(() => {
    return apiMappings.filter((item) => {
      if (
        filters.merchantId !== "all" &&
        item.merchantId !== filters.merchantId
      )
        return false;
      if (filters.gatewayId !== "all" && item.gatewayId !== filters.gatewayId)
        return false;
      if (filters.status !== "all" && item.status !== filters.status)
        return false;
      return true;
    });
  }, [apiMappings, filters]);

  const total = refinedMappings.length;
  const paginatedMappings = useMemo(() => {
    const start = (page - 1) * limit;
    return refinedMappings.slice(start, start + limit);
  }, [refinedMappings, page, limit]);

  const handleRefresh = () => {
    refetchMappings();
    toast.success("Refreshed");
  };

  const openAddModal = () => {
    setFormMode("add");
    setSelectedMapping(null);
    setShowFormModal(true);
  };

  const openEditModal = (mapping: GatewayMapping) => {
    setFormMode("edit");
    setSelectedMapping(mapping);
    setShowFormModal(true);
  };

  const handleFormSubmit = (payload: {
    gatewayId?: string;
    merchantId?: string;
    status: string;
  }) => {
    if (formMode === "edit" && selectedMapping) {
      updateMapping(
        { id: selectedMapping.id, data: { status: payload.status } },
        {
          onSuccess: () => {
            setShowFormModal(false);
            setSelectedMapping(null);
            refetchMappings();
          },
        },
      );
    } else {
      createMapping(
        {
          gatewayId: parseInt(payload.gatewayId!),
          merchantId: parseInt(payload.merchantId!),
          status: payload.status as "ACTIVE" | "INACTIVE",
        },
        {
          onSuccess: () => {
            setShowFormModal(false);
            refetchMappings();
          },
        },
      );
    }
  };

  const confirmDelete = () => {
    if (!mappingToDelete) return;
    setDeleting(true);
    deleteMapping(mappingToDelete.id, {
      onSuccess: () => {
        setMappingToDelete(null);
        setDeleting(false);
        refetchMappings();
      },
      onError: () => setDeleting(false),
    });
  };

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Gateway Mappings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage which gateways are assigned to merchants
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
          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openAddModal} className={BTN_PRIMARY}>
            <Plus size={16} /> Add Mapping
          </button>

          {isFiltersVisible && (
            <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] w-[720px]">
              <GatewayMerchantFilters
                filters={filters}
                setFilters={setFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
                gateways={apiGateways as Gateway[]}
                merchants={apiMerchants as Merchant[]}
              />
            </div>
          )}
        </div>
      </div>

      <GatewayMerchantTable
        mappings={paginatedMappings}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={(l) => {
          setLimit(l);
          setPage(1);
        }}
        total={total}
        onEdit={openEditModal}
        onDelete={(m) => setMappingToDelete(m)}
      />

      {/* Add/Edit modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-lg max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h2 className="text-sm font-semibold text-slate-900">
                {formMode === "edit" ? "Edit Mapping" : "Add Gateway Mapping"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {formMode === "edit"
                  ? "Update the status of this mapping"
                  : "Assign a gateway to a merchant"}
              </p>
            </div>
            <div className={MODAL_BODY}>
              <GatewayMerchantForm
                mode={formMode}
                gateways={apiGateways as Gateway[]}
                merchants={apiMerchants as Merchant[]}
                mapping={selectedMapping}
                submitting={isCreating || isUpdating}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setShowFormModal(false);
                  setSelectedMapping(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {mappingToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-50">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete Mapping?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete the mapping between{" "}
                  <span className="font-semibold text-slate-900">
                    {mappingToDelete.gatewayName}
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-slate-900">
                    {mappingToDelete.merchantName}
                  </span>
                  ?
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  This action cannot be undone. The merchant will no longer be
                  able to use this gateway.
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => setMappingToDelete(null)}
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || isDeleting}
                className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting || isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
