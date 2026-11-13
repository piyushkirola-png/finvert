import { memo, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "../../components/context/CurrencyContext";
import { formatCurrencyAxisWithSymbol } from "../../utils/currencyFormatter";

interface GatewayPerformanceChartProps {
  data: Array<{
    name: string;
    payin: number;
    payout: number;
    refund: number;
    chargeback: number;
  }>;
  currency: string;
}

type ViewType = "payin" | "payout" | "refund" | "chargeback";

const gatewayColors = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

function GatewayPerformanceChart({
  data,
  currency,
}: GatewayPerformanceChartProps) {
  const { getSymbol } = useCurrency();
  const [viewType, setViewType] = useState<ViewType>("payin");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const option = useMemo(() => {
    const hasData = data.length > 0;
    const gateways = hasData ? data.map((d) => d.name) : ["No Data"];
    const values = hasData
      ? data.map((d) => {
          if (viewType === "payin") return d.payin;
          if (viewType === "payout") return d.payout;
          if (viewType === "refund") return d.refund || 0;
          if (viewType === "chargeback") return d.chargeback || 0;
          return 0;
        })
      : [0];
    const symbol = getSymbol(currency);

    return {
      tooltip: {
        trigger: "axis",
        formatter: function (params: any) {
          const p = params[0];
          if (p.axisValue === "No Data") return "No data available";
          return `<strong>${p.axisValue}</strong><br/>${symbol}${p.value.toLocaleString()}`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: gateways,
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
          rotate: data.length > 5 ? 30 : 0,
        },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        name: "Gateway",
        nameLocation: "center",
        nameGap: 30,
        nameTextStyle: { color: "#94a3b8", fontSize: 12 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f1f5f9" } },
        axisLabel: {
          color: "#94a3b8",
          formatter: (value: number) =>
            formatCurrencyAxisWithSymbol(value, symbol),
        },
        name: "Amount",
        nameLocation: "center",
        nameGap: 45,
        nameTextStyle: { color: "#94a3b8", fontSize: 12 },
      },
      series: [
        {
          data: values,
          type: "bar",
          barWidth: Math.min(40, 60 / (gateways.length || 1)),
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: function (params: any) {
              const index = params.dataIndex || 0;
              return gatewayColors[index % gatewayColors.length];
            },
          },
        },
      ],
    };
  }, [data, currency, viewType, getSymbol]);

  const viewLabels: Record<ViewType, string> = {
    payin: "PayIn",
    payout: "Payout",
    refund: "Refund",
    chargeback: "Chargeback",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Gateway Performance
          </h2>
          <p className="text-xs text-slate-500">
            Transaction routing analytics
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            {viewLabels[viewType]}
            <ChevronDown
              size={15}
              className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden min-w-[130px]">
              {Object.entries(viewLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setViewType(key as ViewType);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition ${viewType === key ? "text-slate-900 font-medium bg-slate-100" : "text-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="h-72">
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}

export default memo(GatewayPerformanceChart);
