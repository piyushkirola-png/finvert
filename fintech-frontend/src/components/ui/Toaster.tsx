import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group flex items-start gap-3 rounded-lg border border-slate-200 bg-white shadow-lg p-4 text-sm text-slate-900 font-sans",
          title: "font-semibold text-slate-900 text-sm",
          description: "text-slate-500 text-xs mt-0.5",
          success: "border-green-200",
          error: "border-red-200",
          warning: "border-amber-200",
          info: "border-blue-200",
        },
      }}
      icons={{
        success: (
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        ),
        error: <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
        warning: (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ),
        info: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      }}
    />
  );
}
