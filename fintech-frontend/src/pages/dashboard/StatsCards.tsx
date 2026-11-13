import {
  Wallet,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Repeat,
  Clock,
  XCircle,
  CheckCircle,
} from "lucide-react";
import type { DashboardStats } from "../../types/dashboard";
import { STAT_CARD, STAT_ICON_WRAP } from "../../lib/styles";

interface StatsCardsProps {
  stats: DashboardStats;
  formatCurrency: (amount: number) => string;
}

type ColorKey =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "red"
  | "pink"
  | "cyan"
  | "amber"
  | "emerald"
  | "rose"
  | "indigo";

const statColors: Record<ColorKey, string> = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  pink: "bg-pink-50 text-pink-600",
  cyan: "bg-cyan-50 text-cyan-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  indigo: "bg-indigo-50 text-indigo-600",
} as const;

function Card({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: ColorKey;
}) {
  return (
    <div className={STAT_CARD}>
      <div className="flex items-center justify-between mb-3">
        <div className={`${STAT_ICON_WRAP} ${statColors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-base font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function StatsCards({ stats, formatCurrency }: StatsCardsProps) {
  const payinItems = [
    {
      title: "PayIn Wallet Balance",
      value: formatCurrency(stats.currentBalance || 0),
      icon: Wallet,
      color: "blue" as ColorKey,
    },
    {
      title: "Today's PayIn",
      value: formatCurrency(stats.todayPayIn || 0),
      icon: TrendingUp,
      color: "green" as ColorKey,
    },
    {
      title: "Average PayIn",
      value: formatCurrency(stats.averagePayIn || 0),
      icon: TrendingUp,
      color: "emerald" as ColorKey,
    },
    {
      title: "Success PayIn Count",
      value: stats.successPayInCount?.toString() || "0",
      icon: CheckCircle,
      color: "green" as ColorKey,
    },
    {
      title: "Pending PayIn Count",
      value: stats.pendingPayInCount?.toString() || "0",
      icon: Clock,
      color: "amber" as ColorKey,
    },
    {
      title: "Failed PayIn Count",
      value: stats.failedPayInCount?.toString() || "0",
      icon: XCircle,
      color: "red" as ColorKey,
    },
    {
      title: "Total PayIn Transactions",
      value: stats.totalPayInTransactions?.toString() || "0",
      icon: CreditCard,
      color: "purple" as ColorKey,
    },
    {
      title: "Success Rate (PayIn)",
      value: `${stats.payInSuccessRate || 0}%`,
      icon: ShieldCheck,
      color: "orange" as ColorKey,
    },
  ];

  const payoutItems = [
    {
      title: "Payout Wallet Balance",
      value: formatCurrency(stats.payoutWalletBalance || 0),
      icon: Wallet,
      color: "indigo" as ColorKey,
    },
    {
      title: "Today's Payout",
      value: formatCurrency(stats.todayPayout || 0),
      icon: TrendingDown,
      color: "cyan" as ColorKey,
    },
    {
      title: "Average Payout",
      value: formatCurrency(stats.averagePayout || 0),
      icon: TrendingDown,
      color: "purple" as ColorKey,
    },
    {
      title: "Success Payout Count",
      value: stats.successPayoutCount?.toString() || "0",
      icon: CheckCircle,
      color: "emerald" as ColorKey,
    },
    {
      title: "Pending Payout Count",
      value: stats.pendingPayoutCount?.toString() || "0",
      icon: Clock,
      color: "amber" as ColorKey,
    },
    {
      title: "Failed Payout Count",
      value: stats.failedPayoutCount?.toString() || "0",
      icon: XCircle,
      color: "rose" as ColorKey,
    },
    {
      title: "Total Payout Transactions",
      value: stats.totalPayoutTransactions?.toString() || "0",
      icon: CreditCard,
      color: "pink" as ColorKey,
    },
    {
      title: "Success Rate (Payout)",
      value: `${stats.payoutSuccessRate || 0}%`,
      icon: ShieldCheck,
      color: "orange" as ColorKey,
    },
  ];

  const bottomItems = [
    {
      title: "Pending Settlements",
      value: formatCurrency(stats.pendingSettlements || 0),
      icon: Clock,
      color: "amber" as ColorKey,
    },
    {
      title: "Chargeback Amount",
      value: formatCurrency(stats.chargebackAmount || 0),
      icon: AlertCircle,
      color: "red" as ColorKey,
    },
    {
      title: "Refund Amount",
      value: formatCurrency(stats.refundAmount || 0),
      icon: Repeat,
      color: "pink" as ColorKey,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {payinItems.slice(0, 3).map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {payoutItems.slice(0, 3).map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {payinItems.slice(3, 6).map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {payoutItems.slice(3, 6).map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card {...payinItems[6]} />
          <Card {...payinItems[7]} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card {...payoutItems[6]} />
          <Card {...payoutItems[7]} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bottomItems.map((item) => (
          <Card key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}
