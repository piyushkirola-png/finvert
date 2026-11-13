import { FileSpreadsheet, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { usePayoutBulkUploadStats } from "../../api/queries/usePayoutBulkUpload";
import { STAT_CARD, STAT_ICON_WRAP } from "../../lib/styles";

interface Props {
  statusFilter?: string;
  isAdmin?: boolean;
}

export default function BulkUploadStats({
  statusFilter = "ALL",
  isAdmin = true,
}: Props) {
  const { data: stats, isLoading } = usePayoutBulkUploadStats(
    statusFilter,
    isAdmin,
  );

  const cards = [
    {
      label: "Total Uploads",
      value: stats?.total || 0,
      icon: FileSpreadsheet,
      color: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-900",
    },
    {
      label: "Completed",
      value: stats?.completed || 0,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Failed",
      value: stats?.failed || 0,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
    {
      label: "Processing",
      value: stats?.processing || 0,
      icon: Clock3,
      color: "bg-amber-50 text-amber-600",
      valueClass: "text-amber-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${STAT_CARD} animate-pulse`}>
            <div className="h-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={STAT_CARD}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className={`text-xl font-semibold mt-1 ${c.valueClass}`}>
                  {c.value}
                </p>
              </div>
              <div className={`${STAT_ICON_WRAP} ${c.color}`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
