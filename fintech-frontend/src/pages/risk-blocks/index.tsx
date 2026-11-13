import { useState, useMemo } from "react";
import { Plus, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { useRiskBlocks } from "../../api/queries/useRiskBlocks";
import { useDeleteRiskBlock } from "../../api/mutations/riskMutations";
import type { RiskBlock } from "../../types/risk";
import RiskBlockFilters, {
  type RiskBlockFilterValues,
} from "./RiskBlockFilters";
import RiskBlockTable from "./RiskBlockTable";
import RiskBlocksForm from "./RiskBlocksForm";
import RiskStatsCard from "./RiskStatsCard";
import {
  PAGE_HEADER,
  BTN_FILTER,
  BTN_REFRESH,
  BTN_PRIMARY,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
} from "../../lib/styles";

const DEFAULT_FILTERS: RiskBlockFilterValues = {
  type: "All",
  value: "",
  isActive: "All",
};

export default function RiskBlocks() {
  const [filters, setFilters] =
    useState<RiskBlockFilterValues>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRiskBlock, setEditingRiskBlock] = useState<RiskBlock | null>(
    null,
  );

  const apiFilters: any = {};
  if (filters.type && filters.type !== "All") apiFilters.type = filters.type;
  if (filters.value) apiFilters.value = filters.value.trim();
  if (filters.isActive !== "All") {
    apiFilters.isActive = filters.isActive === "ACTIVE" ? "true" : "false";
  }

  const {
    data: allData = [],
    refetch,
    isLoading: loading,
  } = useRiskBlocks(apiFilters);
  const { mutate: deleteRiskBlock } = useDeleteRiskBlock();

  // Stats from data
  const stats = useMemo(() => {
    const total = allData.length;
    const active = allData.filter((b: RiskBlock) => b.isActive).length;
    const inactive = allData.filter((b: RiskBlock) => !b.isActive).length;
    return { total, active, inactive };
  }, [allData]);

  // Client-side pagination
  const total = allData.length;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return allData.slice(start, start + limit);
  }, [allData, page, limit]);

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshed");
  };

  const updateFilters = (newFilters: RiskBlockFilterValues) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleDelete = (id: number) => {
    deleteRiskBlock(id, {
      onSuccess: () => {
        refetch();
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || "Failed to delete risk block",
        );
      },
    });
  };

  const handleEdit = (row: RiskBlock) => {
    setEditingRiskBlock(row);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingRiskBlock(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Risk Blocks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage blacklisted entities, card ranges, and users to prevent fraud
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
          <button onClick={handleAddClick} className={BTN_PRIMARY}>
            <Plus size={16} /> Add Risk Block
          </button>

          {isFiltersVisible && (
            <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] w-[720px]">
              <RiskBlockFilters
                filters={filters}
                setFilters={updateFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
              />
            </div>
          )}
        </div>
      </div>

      <RiskStatsCard stats={stats} loading={loading} />

      <RiskBlockTable
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
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-lg max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h2 className="text-sm font-semibold text-slate-900">
                {editingRiskBlock ? "Edit Risk Block" : "Add Risk Block"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingRiskBlock
                  ? "Update blocked entity details"
                  : "Create a new entity block rule"}
              </p>
            </div>
            <div className={MODAL_BODY}>
              <RiskBlocksForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={() => refetch()}
                riskBlock={editingRiskBlock}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
