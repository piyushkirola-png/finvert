import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CodeBlockProps {
  label: string;
  code: string | object;
  maxHeight?: string;
  language?: string;
  className?: string;
  hideCopy?: boolean;
  headerIcon?: React.ReactNode;
  tone?: "slate" | "green" | "red" | "purple";
}

const toneMap: Record<string, string> = {
  slate: "text-slate-400",
  green: "text-green-400",
  red: "text-red-400",
  purple: "text-purple-400",
};

export default function CodeBlock({
  label,
  code,
  maxHeight = "",
  className = "",
  hideCopy = false,
  headerIcon,
  tone = "slate",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const text = typeof code === "string" ? code : JSON.stringify(code, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`bg-slate-900 rounded-lg overflow-hidden border border-slate-800 ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          {headerIcon}
          <span
            className={`text-xs font-mono truncate ${toneMap[tone] ?? toneMap.slate}`}
          >
            {label}
          </span>
        </div>
        {!hideCopy && (
          <button
            type="button"
            onClick={copy}
            className="p-1.5 rounded-md hover:bg-slate-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            title="Copy"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-slate-400 hover:text-white" />
            )}
          </button>
        )}
      </div>
      <div className={`p-4 overflow-x-auto overflow-y-auto ${maxHeight}`}>
        <pre className="text-xs sm:text-sm font-mono text-slate-300 whitespace-pre-wrap break-all">
          {text}
        </pre>
      </div>
    </div>
  );
}
