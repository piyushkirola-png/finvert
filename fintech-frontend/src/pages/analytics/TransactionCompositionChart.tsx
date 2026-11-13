import { memo, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useCurrency } from "../../components/context/CurrencyContext";

interface TransactionCompositionChartProps {
  data:
    | {
        payin: number;
        payout: number;
        refund: number;
        chargeback: number;
        total: number;
      }
    | null
    | undefined;
  currency: string;
}

function TransactionCompositionChart({
  data,
  currency,
}: TransactionCompositionChartProps) {
  const { getSymbol } = useCurrency();

  const option = useMemo(() => {
    const hasData = data && data.total > 0;
    const symbol = getSymbol(currency);

    const chartData = hasData
      ? [
          { value: data.payin, name: "PayIn", itemStyle: { color: "#10b981" } },
          {
            value: data.payout,
            name: "Payout",
            itemStyle: { color: "#3b82f6" },
          },
          {
            value: data.refund,
            name: "Refund",
            itemStyle: { color: "#f59e0b" },
          },
          {
            value: data.chargeback,
            name: "Chargeback",
            itemStyle: { color: "#ef4444" },
          },
        ]
      : [{ value: 1, name: "No Data", itemStyle: { color: "#e2e8f0" } }];

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
        textStyle: { color: "#64748b", fontSize: 12 },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 16,
        icon: "circle",
      },
      series: [
        {
          type: "pie",
          radius: ["50%", "72%"],
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
              per: { color: "#94a3b8", fontSize: 11 },
            },
            fontSize: 11,
          },
          emphasis: {
            scale: false,
            label: { show: true, fontSize: 13, fontWeight: "bold" },
          },
          data: chartData,
        },
      ],
    };
  }, [data, currency, getSymbol]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Transaction Composition
        </h2>
        <p className="text-xs text-slate-500">
          PayIn, Payout, Refund & Chargeback distribution
        </p>
      </div>
      <div className="h-80">
        {!data || data.total === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">No transaction data available</p>
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

export default memo(TransactionCompositionChart);
