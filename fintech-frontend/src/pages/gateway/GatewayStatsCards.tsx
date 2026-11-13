import {
  Layers3,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import type { Gateway } from "../../types/gateway";
import { STAT_CARD, STAT_ICON_WRAP } from "../../lib/styles";

interface Props {
  gateways: Gateway[];
}

export default function GatewayStatsCards({ gateways }: Props) {
  const total = gateways.length;
  const active = gateways.filter((g) => g.is_active).length;
  const payin = gateways.filter(
    (g) => g.service_type === "payin" || g.service_type === "both",
  ).length;
  const payout = gateways.filter(
    (g) => g.service_type === "payout" || g.service_type === "both",
  ).length;

  const cards = [
    {
      label: "Total Gateways",
      value: total,
      icon: Layers3,
      color: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-800",
    },
    {
      label: "Active Gateways",
      value: active,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Payin Gateways",
      value: payin,
      icon: ArrowDownCircle,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
    },
    {
      label: "Payout Gateways",
      value: payout,
      icon: ArrowUpCircle,
      color: "bg-purple-50 text-purple-600",
      valueClass: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={STAT_CARD}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`text-xl font-semibold mt-1 ${card.valueClass}`}>
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
  );
}
