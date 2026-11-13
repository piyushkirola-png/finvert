import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "../../components/context/CurrencyContext";
import {
  useOutboundWebhooks,
  useOutboundWebhookDetails,
} from "../../api/queries/useWebhooks";
import { useRetryWebhook } from "../../api/mutations/webhookMutations";
import OutboundWebhookFilters, {
  type OutboundFilterValues,
} from "./OutboundWebhookFilters";
import WebhookTable, { type WebhookRow } from "./WebhookTable";
import WebhookDetailsModal from "./WebhookDetailsModal";
import { PAGE_HEADER, BTN_FILTER, BTN_REFRESH } from "../../lib/styles";
import api from "../../lib/api-client";

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const DEFAULT_FILTERS: OutboundFilterValues = {
  status: "all",
  gateway: "all",
  event: "all",
  merchantId: "",
  amountMin: "",
  amountMax: "",
};

export default function OutboundWebhooks() {
  const { formatCurrency } = useCurrency();
  const [filters, setFilters] = useState<OutboundFilterValues>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(
    null,
  );

  const hasFilter =
    filters.status !== "all" ||
    filters.gateway !== "all" ||
    filters.event !== "all" ||
    filters.merchantId !== "" ||
    filters.amountMin !== "" ||
    filters.amountMax !== "";

  const dateRange: { startDate?: string; endDate?: string } = hasFilter
    ? ({} as { startDate?: string; endDate?: string })
    : getTodayRange();

  const {
    data: webhooks = [],
    refetch,
    isLoading: loading,
  } = useOutboundWebhooks({
    limit: 1000,
    offset: 0,
    status: filters.status !== "all" ? filters.status : undefined,
    eventType: filters.event !== "all" ? filters.event : undefined,
    merchantId: filters.merchantId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: selectedWebhook = null, isLoading: loadingDetails } =
    useOutboundWebhookDetails(selectedWebhookId);

  const { mutate: retryWebhook, isPending: isRetrying } = useRetryWebhook();

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Client-side refine: gateway, amount
  const refined = useMemo(() => {
    return webhooks.filter((item: any) => {
      if (filters.gateway !== "all" && item.gatewayName !== filters.gateway)
        return false;
      const amt = Number(item.amount || 0);
      if (filters.amountMin && amt < Number(filters.amountMin)) return false;
      if (filters.amountMax && amt > Number(filters.amountMax)) return false;
      return true;
    });
  }, [webhooks, filters]);

  const paged = useMemo(
    () => refined.slice((page - 1) * limit, page * limit),
    [refined, page, limit],
  );
  const gatewayOptions = useMemo(
    () =>
      [
        ...new Set(webhooks.map((w: any) => w.gatewayName).filter(Boolean)),
      ] as string[],
    [webhooks],
  );
  const eventOptions = useMemo(
    () =>
      [
        ...new Set(webhooks.map((w: any) => w.eventType).filter(Boolean)),
      ] as string[],
    [webhooks],
  );

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshed");
  };

  const handleRetry = (id: number) => {
    retryWebhook(id, {
      onSuccess: () => refetch(),
    });
  };

  const handleModalRetry = () => {
    if (selectedWebhookId === null) return;
    retryWebhook(selectedWebhookId, {
      onSuccess: () => {
        refetch();
        setSelectedWebhookId(null);
      },
    });
  };

  const fetchOutboundPayload = async (
    id: number,
    kind: "requestBody" | "responseBody",
  ) => {
    const { data } = await api.get(`/webhooks/outbound/${id}`);
    const detail = data?.data ?? data;
    return detail?.[kind] ?? null;
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "merchantName", label: "Merchant" },
    { key: "gatewayName", label: "Gateway" },
    { key: "eventType", label: "Event" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "requestBody", label: "Request" },
    { key: "responseBody", label: "Response" },
    { key: "createdAt", label: "Sent At" },
  ];

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Outbound Webhooks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Webhooks sent to merchants
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

          {isFiltersVisible && (
            <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] w-[720px]">
              <OutboundWebhookFilters
                filters={filters}
                setFilters={setFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
                gatewayOptions={gatewayOptions}
                eventOptions={eventOptions}
              />
            </div>
          )}
        </div>
      </div>

      <WebhookTable
        rows={paged as WebhookRow[]}
        columns={columns}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={(l) => {
          setLimit(l);
          setPage(1);
        }}
        total={refined.length}
        formatCurrency={formatCurrency}
        onView={(id) => setSelectedWebhookId(id)}
        onRetry={handleRetry}
        isRetrying={isRetrying}
        emptyText="No outbound webhooks found"
        onFetchPayload={fetchOutboundPayload}
      />

      <WebhookDetailsModal
        isOpen={selectedWebhookId !== null}
        onClose={() => setSelectedWebhookId(null)}
        loading={loadingDetails}
        data={selectedWebhook}
        title="Outbound Webhook Details"
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        showRetry
        onRetry={handleModalRetry}
        isRetrying={isRetrying}
      />
    </div>
  );
}
