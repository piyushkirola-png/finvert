import { memo, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "../../components/context/CurrencyContext";
import { formatCurrencyAxisWithSymbol } from "../../utils/currencyFormatter";

interface HourlyVolumeChartProps {
  data:
    | {
        hours: string[];
        payin: {
          success: number[];
          pending: number[];
          failed: number[];
        };
        payout: {
          success: number[];
          pending: number[];
          failed: number[];
        };
        refund: number[];
        chargeback: number[];
      }
    | null
    | undefined;
  currency: string;
}

type ViewType = "payin" | "payout" | "refund" | "chargeback";

function HourlyVolumeChart({ data, currency }: HourlyVolumeChartProps) {
  const { getSymbol } = useCurrency();
  const [viewType, setViewType] = useState<ViewType>("payin");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const option = useMemo(() => {
    const hasData = data && data.hours && data.hours.length > 0;
    const hours = hasData ? data.hours : ["No Data"];
    const symbol = getSymbol(currency);

    let seriesData: { name: string; data: number[]; color: string }[] = [];

    if (hasData) {
      if (viewType === "payin") {
        seriesData = [
          { name: "Completed", data: data.payin.success, color: "#10b981" },
          { name: "Pending", data: data.payin.pending, color: "#f59e0b" },
          { name: "Failed", data: data.payin.failed, color: "#ef4444" },
        ];
      } else if (viewType === "payout") {
        seriesData = [
          { name: "Completed", data: data.payout.success, color: "#10b981" },
          { name: "Pending", data: data.payout.pending, color: "#f59e0b" },
          { name: "Failed", data: data.payout.failed, color: "#ef4444" },
        ];
      } else if (viewType === "refund") {
        seriesData = [{ name: "Refund", data: data.refund, color: "#f59e0b" }];
      } else if (viewType === "chargeback") {
        seriesData = [
          { name: "Chargeback", data: data.chargeback, color: "#ef4444" },
        ];
      }
    }

    return {
      tooltip: {
        trigger: "axis",
        formatter: function (params: any) {
          let html = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((p: any) => {
            html += `${p.marker} ${p.seriesName}: ${symbol}${p.value.toLocaleString()}<br/>`;
          });
          return html;
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
        data: hours,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
        name: "Time",
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
        nameGap: 50,
        nameTextStyle: { color: "#94a3b8", fontSize: 12 },
      },
      series: seriesData.map((s) => ({
        name: s.name,
        type: "bar",
        data: s.data,
        barWidth: Math.min(20, 80 / (hours.length || 1)),
        itemStyle: {
          borderRadius: [0, 0, 0, 0],
          color: s.color,
        },
      })),
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
            Hourly Volume
          </h2>
          <p className="text-xs text-slate-500">Hourly distribution</p>
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
        />
      </div>
    </div>
  );
}

export default memo(HourlyVolumeChart);
