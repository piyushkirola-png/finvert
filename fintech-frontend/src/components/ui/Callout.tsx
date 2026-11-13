import {
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

type Tone = "info" | "success" | "warning" | "danger" | "neutral";

interface CalloutProps {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

const toneConfig: Record<
  Tone,
  { wrap: string; iconColor: string; Icon: LucideIcon; title: string }
> = {
  info: {
    wrap: "bg-blue-50 border border-blue-200",
    iconColor: "text-blue-600",
    Icon: Info,
    title: "text-slate-800",
  },
  success: {
    wrap: "bg-green-50 border border-green-200",
    iconColor: "text-green-600",
    Icon: CheckCircle,
    title: "text-slate-800",
  },
  warning: {
    wrap: "bg-yellow-50 border border-yellow-200",
    iconColor: "text-yellow-600",
    Icon: AlertCircle,
    title: "text-slate-800",
  },
  danger: {
    wrap: "bg-red-50 border border-red-200",
    iconColor: "text-red-600",
    Icon: XCircle,
    title: "text-slate-800",
  },
  neutral: {
    wrap: "bg-slate-50 border border-slate-200",
    iconColor: "text-slate-600",
    Icon: Shield,
    title: "text-slate-800",
  },
};

export default function Callout({
  tone = "info",
  title,
  children,
  icon,
  className = "",
}: CalloutProps) {
  const cfg = toneConfig[tone];
  const Icon = icon ?? cfg.Icon;

  return (
    <div className={`rounded-lg p-4 ${cfg.wrap} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${cfg.iconColor} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className={`text-sm font-semibold ${cfg.title}`}>{title}</h5>
          )}
          <div className={`text-sm text-slate-600 ${title ? "mt-1" : ""}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Convenience sub-component for the retry/delivery block used in callbacks */
export function RetryCallout({ children }: { children: React.ReactNode }) {
  return (
    <Callout tone="info" icon={RefreshCw} title="Delivery & Retry">
      {children}
    </Callout>
  );
}
