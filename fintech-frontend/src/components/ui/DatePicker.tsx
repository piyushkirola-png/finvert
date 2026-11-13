import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { INPUT } from "../../lib/styles";

interface Props {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  align?: "left" | "right";
}

const GOLD_DARK = "#B8860B";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  align = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(value ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const pick = (day: number) => {
    onChange(new Date(year, month, day));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => {
          setView(value ?? new Date());
          setOpen((o) => !o);
        }}
        className={`${INPUT} flex items-center justify-between gap-2 text-left !bg-white hover:!bg-[#f5efe0] focus:!bg-white active:!bg-white focus:!ring-0 focus:!outline-none transition-colors`}
      >
        <span
          className={`truncate ${value ? "text-slate-900" : "text-slate-400"}`}
        >
          {value ? fmt(value) : placeholder}
        </span>
        {value ? (
          <X
            size={14}
            className="text-slate-400 hover:text-slate-700 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : (
          <Calendar size={14} className="text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div
          className={`absolute z-[60] mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="p-1 rounded-md text-slate-600 hover:bg-[#f5efe0]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="p-1 rounded-md text-slate-600 hover:bg-[#f5efe0]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <span
                key={d}
                className="text-center text-[11px] font-medium text-slate-400 py-1"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const date = new Date(year, month, day);
              const selected = !!value && sameDay(date, value);
              const isToday = sameDay(date, today);
              // today is gold by default when nothing is selected
              const gold = selected || (isToday && !value);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(day)}
                  style={
                    gold
                      ? { backgroundColor: GOLD_DARK, color: "#fff" }
                      : undefined
                  }
                  className={`h-8 w-8 mx-auto rounded-md text-xs font-medium transition ${
                    gold
                      ? "hover:opacity-90"
                      : isToday
                        ? "border text-slate-900 hover:bg-[#f5efe0]"
                        : "text-slate-700 hover:bg-[#f5efe0]"
                  }`}
                  {...(isToday && !gold
                    ? { style: { borderColor: GOLD_DARK } }
                    : {})}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-xs font-medium text-slate-500 hover:text-red-600"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(new Date());
                setOpen(false);
              }}
              className="text-xs font-medium hover:underline"
              style={{ color: GOLD_DARK }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
