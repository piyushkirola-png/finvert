export const PAGE_HEADER =
  "bg-white border border-slate-200 rounded-lg px-6 py-4 flex items-center justify-between flex-wrap gap-4 relative z-30";

export const CARD = "bg-white border border-slate-200 rounded-lg";

export const TABLE_SHELL =
  "bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden relative z-0";

export const TH =
  "px-4 py-3 text-left text-xs font-semibold text-slate-700 bg-slate-50";

export const TD = "px-4 py-3 text-sm text-slate-700";

export const TD_MONO = "px-4 py-3 font-mono text-xs text-slate-600";

export const BTN_FILTER =
  "inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] hover:shadow-sm transition focus:outline-none focus-visible:outline-none";

export const BTN_EXPORT =
  "inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] hover:shadow-sm transition disabled:opacity-50 focus:outline-none focus-visible:outline-none";

export const BTN_REFRESH =
  "inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] hover:shadow-sm transition disabled:opacity-50 focus:outline-none focus-visible:outline-none";

export const BTN_PRIMARY =
  "inline-flex items-center gap-2 h-9 px-3 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 hover:shadow-sm transition disabled:opacity-50 focus:outline-none focus-visible:outline-none";

export const INPUT =
  "w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[#e6ddc9] focus:border-[#d4c9a8] transition";

export const LABEL = "text-sm font-medium text-slate-700";

export const FILTER_PANEL =
  "absolute right-0 top-full mt-2 z-50 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden min-w-[220px]";

export const FILTER_PANEL_HEADER =
  "px-5 py-3 border-b border-slate-200 flex items-center justify-between";

export const FILTER_PANEL_FOOTER =
  "px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50";

export const MODAL_SHELL =
  "bg-white rounded-lg shadow-xl border border-slate-200 w-full flex flex-col relative";

export const MODAL_HEADER = "px-6 py-4 border-b border-slate-200 flex-shrink-0";

export const MODAL_BODY = "flex-1 overflow-y-auto px-6 py-4";

export const MODAL_FOOTER =
  "px-6 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 bg-slate-50";

export const BADGE =
  "px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1";

export const BADGE_COLORS = {
  green: "text-green-500 bg-green-500/10 border border-green-500/20",
  yellow: "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20",
  red: "text-red-500 bg-red-500/10 border border-red-500/20",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  orange: "bg-orange-50 text-orange-700 border border-orange-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  gray: "bg-gray-50 text-gray-700 border border-gray-200",
  slate: "bg-slate-100 text-slate-700 border border-slate-200",
} as const;

export const STAT_CARD = "bg-white border border-slate-200 rounded-lg p-4";

export const STAT_ICON_WRAP =
  "w-9 h-9 rounded-md flex items-center justify-center";
