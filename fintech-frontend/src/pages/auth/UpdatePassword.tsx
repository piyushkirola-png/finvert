import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api-client";
import { useAuth } from "../../components/context/AuthContext";
import { useCurrency } from "../../components/context/CurrencyContext";
import { INPUT, LABEL, PAGE_HEADER, BTN_PRIMARY } from "../../lib/styles";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const { currency, getSymbol } = useCurrency();
  const isAdmin = role === "ADMIN";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Currency dropdown (future)
  // const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  // const [currencySearch, setCurrencySearch] = useState("");
  // const [currencyList, setCurrencyList] = useState<string[]>(DEFAULT_CURRENCIES);
  // const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  // useEffect(() => { ...fetchCurrencies... }, []);
  // useEffect(() => { ...click outside... }, [isCurrencyOpen]);
  // const handleSaveCurrency = async (next) => {...};
  // const filteredCurrencies = useMemo(...);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must differ from current password");
      return;
    }

    setIsLoading(true);
    try {
      await api.put("/auth/update-password", {
        currentPassword,
        newPassword,
      });
      setIsSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        toast.error("Session expired, please login again");
        await logout();
        navigate("/login");
        return;
      }
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Failed to update password";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ==================== SUCCESS ==================== */
  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Password Updated
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Your password has been successfully updated.
          </p>
          <button
            onClick={() => setIsSuccess(false)}
            className={`${BTN_PRIMARY} mt-5`}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ==================== PASSWORD CARD ==================== */
  const passwordCard = (
    <div className="bg-white border border-slate-200 rounded-lg p-8">
      <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-200">
        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
          <Lock size={20} className="text-purple-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Security
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Change Password
          </h2>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        {/* Current Password */}
        <div className="space-y-1">
          <label className={LABEL}>Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              disabled={isLoading}
              className={`${INPUT} pr-10 h-11`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              disabled={isLoading}
            >
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1">
          <label className={LABEL}>New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              disabled={isLoading}
              className={`${INPUT} pr-10 h-11`}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              disabled={isLoading}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div className="space-y-1">
          <label className={LABEL}>Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              disabled={isLoading}
              className={`${INPUT} pr-10 h-11`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              disabled={isLoading}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-slate-50 border border-slate-100 rounded-md p-4">
          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <Shield size={14} className="text-slate-500" />
            Password requirements
          </p>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-600" />
              Minimum 6 characters
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-600" />
              Must differ from current password
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-600" />
              Both new password entries must match
            </li>
          </ul>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="submit"
            disabled={isLoading}
            className="h-10 px-5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Lock size={16} />
            {isLoading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );

  /* ==================== CURRENCY CARD (STATIC) ==================== */
  const currencyCard = (
    <div className="bg-white border border-slate-200 rounded-lg p-8">
      <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-200">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
          <Globe size={20} className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Preferences
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Default Currency
          </h2>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        All amounts across the dashboard will be shown in this currency.
      </p>

      <div className="bg-slate-50 border border-slate-100 rounded-md p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
          Current Currency
        </p>
        <p className="text-lg font-semibold text-slate-900">
          {currency}{" "}
          <span className="text-slate-500 text-base">
            ({getSymbol(currency)})
          </span>
        </p>
      </div>

      {/* TODO: Currency dropdown (future) */}
      {/* <button onClick={() => setIsCurrencyOpen(...)} className="..." disabled={isSavingCurrency}>
        Change
      </button> */}
      {/* {isCurrencyOpen && (
        <div className="currency-dropdown ...">
          <input value={currencySearch} onChange={...} />
          {filteredCurrencies.map(...)}
        </div>
      )} */}
    </div>
  );

  /* ==================== PAGE LAYOUT ==================== */
  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isAdmin ? "Update Password" : "Password & Currency"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Change your account password"
              : "Manage your account security and default currency preferences"}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="max-w-2xl">{passwordCard}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {passwordCard}
          {currencyCard}
        </div>
      )}
    </div>
  );
}
