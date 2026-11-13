import { useState, useMemo } from "react";
import {
  RefreshCw,
  Plus,
  Users,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMerchants, useMerchantStats } from "../../api/queries/useMerchants";
import { useDeleteMerchant } from "../../api/mutations/merchantMutations";
import type { Merchant } from "../../types/merchant";
import MerchantManagement from "./MerchantManagement";
import MerchantFilters, { type MerchantFiltersState } from "./MerchantFilters";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_REFRESH,
  BTN_PRIMARY,
} from "../../lib/styles";

export default function MerchantsListPage() {
  const navigate = useNavigate();
  const {
    data: merchants = [],
    refetch: refetchMerchants,
    isLoading: merchantsLoading,
  } = useMerchants();
  const {
    data: stats,
    refetch: refetchStats,
    isLoading: statsLoading,
  } = useMerchantStats();
  const { mutate: deleteMerchant } = useDeleteMerchant();

  const isLoading = merchantsLoading || statsLoading;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<MerchantFiltersState>({
    status: "All",
    plan: "All",
  });

  const handleRefresh = () => {
    refetchMerchants();
    refetchStats();
    toast.success("Refreshed");
  };

  const handleDeleteMerchant = async (merchant: Merchant) => {
    deleteMerchant(merchant.id, {
      onSuccess: () => {
        refetchMerchants();
        refetchStats();
      },
    });
  };

  const filtered = useMemo(
    () =>
      [...merchants]
        .sort((a, b) => a.id - b.id)
        .filter(
          (m) =>
            filters.status === "All" ||
            (m.status || "PENDING") === filters.status,
        )
        .filter(
          (m) =>
            filters.plan === "All" || (m.planType || "BASIC") === filters.plan,
        ),
    [merchants, filters],
  );

  const total = filtered.length;
  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  const rejectedCount =
    (stats as any)?.rejectedMerchants ??
    merchants.filter((m: Merchant) => m.status === "REJECTED").length;

  const statCards = [
    {
      label: "Total Merchants",
      value: stats?.totalMerchants || 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-900",
    },
    {
      label: "Active Merchants",
      value: stats?.activeMerchants || 0,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Pending Merchants",
      value: stats?.pendingMerchants || 0,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
    },
    {
      label: "Rejected Merchants",
      value: rejectedCount,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Merchant Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all merchants and onboarding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MerchantFilters
            filters={filters}
            onApply={(f) => {
              setFilters(f);
              setPage(1);
            }}
            onClear={() => {
              setFilters({ status: "All", plan: "All" });
              setPage(1);
            }}
          />
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={BTN_REFRESH}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
          <button
            onClick={() => navigate("/merchant-onboarding")}
            className={BTN_PRIMARY}
          >
            <Plus size={16} /> Add Merchant
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={STAT_CARD}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p
                    className={`text-xl font-semibold mt-1 ${card.valueClass}`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className={`${STAT_ICON_WRAP} ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MerchantManagement
        merchants={paginated}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={(l) => {
          setLimit(l);
          setPage(1);
        }}
        total={total}
        onEditMerchant={(merchant) =>
          navigate(`/merchant-onboarding/${merchant.id}`)
        }
        onDeleteMerchant={handleDeleteMerchant}
        onRefresh={refetchMerchants}
      />
    </div>
  );
}
