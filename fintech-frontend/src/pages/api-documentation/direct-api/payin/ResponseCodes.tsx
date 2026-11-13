import { CheckCircle, Clock, XCircle } from "lucide-react";

const responseCodes = [
  {
    code: "COMPLETED",
    name: "Completed",
    description: "Payment completed successfully. Funds have been credited.",
    icon: CheckCircle,
    iconColor: "text-green-500",
  },
  {
    code: "PENDING",
    name: "Pending",
    description:
      "Payment is pending processing. Customer hasn't completed payment yet.",
    icon: Clock,
    iconColor: "text-yellow-500",
  },
  {
    code: "FAILED",
    name: "Failed",
    description: "Payment failed. Check the error message for details.",
    icon: XCircle,
    iconColor: "text-red-500",
  },
];

const statusColor: Record<string, string> = {
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
};

export default function ResponseCodes() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        These are the possible status codes returned by the PayIn API.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {responseCodes.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.code}
              className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex items-start gap-3 hover:shadow-sm transition"
            >
              <Icon size={16} className={`${item.iconColor} mt-0.5`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${statusColor[item.code] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {item.code}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {item.name}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
