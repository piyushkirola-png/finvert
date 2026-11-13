import { Users, CheckCircle2, Clock3, Activity } from "lucide-react";
import type { User } from "../../types/user";
import { STAT_CARD, STAT_ICON_WRAP } from "../../lib/styles";

interface Props {
  users: User[];
}

export default function UsersStats({ users }: Props) {
  const total = users.length;
  const active = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const systemUsers = users.length;

  const cards = [
    {
      label: "Total Users",
      value: total,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-800",
    },
    {
      label: "Active Users",
      value: active,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Inactive Users",
      value: inactive,
      icon: Clock3,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
    },
    {
      label: "System Users",
      value: systemUsers,
      icon: Activity,
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
