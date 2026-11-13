import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth, SESSION_TIMEOUT_MS } from "../context/AuthContext";

/**
 * Floating session timer — shows remaining idle time as MM:SS.
 * Lives only where it's rendered (Dashboard). Ticks every second.
 */
export default function SessionTimer() {
  const { user, lastActivityAt } = useAuth();
  const [remainingMs, setRemainingMs] = useState<number>(SESSION_TIMEOUT_MS);

  useEffect(() => {
    if (!user) return;

    const compute = () => {
      const elapsed = Date.now() - lastActivityAt;
      const left = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
      setRemainingMs(left);
    };

    compute(); // immediate
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [user, lastActivityAt]);

  if (!user) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // Color by remaining time
  const tone =
    totalSeconds <= 5 * 60
      ? "bg-red-600 text-white"
      : totalSeconds <= 10 * 60
        ? "bg-amber-500 text-white"
        : "bg-slate-900 text-white";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg ${tone}`}
      title="Session expires after 30 minutes of inactivity"
    >
      <Clock size={16} />
      <span className="font-mono text-sm font-semibold tabular-nums">
        {display}
      </span>
    </div>
  );
}