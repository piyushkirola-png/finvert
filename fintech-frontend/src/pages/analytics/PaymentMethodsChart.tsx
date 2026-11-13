import { memo, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "../../components/context/CurrencyContext";

interface PaymentMethodsChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
    type: "payin" | "payout";
  }>;
  currency: string;
}

type ViewType = "payin" | "payout";

function PaymentMethodsChart({ data, currency }: PaymentMethodsChartProps) {
  const { getSymbol } = useCurrency();
  const [viewType, setViewType] = useState<ViewType>("payin");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const option = useMemo(() => {
    const filteredData = data.filter((d) => d.type === viewType);
    const hasData = filteredData.length > 0;
    const chartData = hasData
      ? filteredData
      : [{ name: "No Data", value: 1, color: "#e2e8f0", type: viewType }];
    const symbol = getSymbol(currency);

    return {
      tooltip: {
        trigger: "item",
        formatter: function (params: any) {
          if (params.name === "No Data") return "No data available";
          return `<strong>${params.name}</strong><br/>${symbol}${params.value.toLocaleString()}`;
        },
      },
      legend: {
        orient: "horizontal",
        left: "center",
        bottom: 0,
        textStyle: { color: "#64748b", fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 8,
        icon: "circle",
      },
      series: [
        {
          type: "pie",
          radius: ["45%", "68%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: hasData,
            formatter: "{b}\n{per|{d}%}",
            rich: {
              per: { color: "#94a3b8", fontSize: 10 },
            },
            fontSize: 10,
          },
          emphasis: {
            scale: false,
            label: { show: true, fontSize: 13, fontWeight: "bold" },
          },
          data: chartData,
        },
      ],
    };
  }, [data, currency, viewType, getSymbol]);

  const viewLabels: Record<ViewType, string> = {
    payin: "PayIn",
    payout: "Payout",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Payment Methods
          </h2>
          <p className="text-xs text-slate-500">
            Transaction distribution by method
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
      <div className="h-80">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">No payment data available</p>
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
          />
        )}
      </div>
    </div>
  );
}

export default memo(PaymentMethodsChart);
