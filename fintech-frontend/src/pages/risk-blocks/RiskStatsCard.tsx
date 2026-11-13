import { Shield, CheckCircle, Ban } from "lucide-react";
import { STAT_CARD, STAT_ICON_WRAP } from "../../lib/styles";

interface Props {
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
  loading?: boolean;
}

export default function RiskStatsCard({ stats, loading }: Props) {
  const cards = [
    {
      label: "Total Risk Blocks",
      value: stats.total,
      icon: Shield,
      color: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-800",
    },
    {
      label: "Active Blocks",
      value: stats.active,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Inactive Blocks",
      value: stats.inactive,
      icon: Ban,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={STAT_CARD}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`text-xl font-semibold mt-1 ${card.valueClass}`}>
                  {loading ? (
                    <span className="inline-block animate-pulse bg-slate-200 h-6 w-12 rounded" />
                  ) : (
                    card.value
                  )}
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
  );
}
