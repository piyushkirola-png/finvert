import { useState, useEffect } from "react";
import { User, Store, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api-client";
import { useAuth } from "../../components/context/AuthContext";
import { useCurrency } from "../../components/context/CurrencyContext";
import { PAGE_HEADER, BADGE, BADGE_COLORS } from "../../lib/styles";

interface MerchantData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  businessName: string | null;
  businessType: string | null;
  gstin: string | null;
  createdAt: string;
  updatedAt: string;
}

// const DEFAULT_CURRENCIES = ["USD", "INR", "EUR", "GBP", "SGD", "PHP", "THB", "AED", "AUD", "CAD"];

const formatDate = (s?: string) => {
  if (!s) return "N/A";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-500 w-40 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <span
      className={`text-base font-medium flex-1 text-slate-900 ${
        mono ? "font-mono" : ""
      }`}
    >
      {value || "-"}
    </span>
  </div>
);

const SectionHeading = ({ title }: { title: string }) => (
  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-5 mb-2">
    {title}
  </p>
);

export default function Profile() {
  const { user: authUser, role } = useAuth();
  const { currency } = useCurrency();
  const isAdmin = role === "ADMIN";

  const [user, setUser] = useState<any>(authUser);
  const [isLoading, setIsLoading] = useState(!authUser);
  const [error, setError] = useState<string | null>(null);

  // TODO: Currency dropdown state — will be added later
  // const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  // const [currencySearch, setCurrencySearch] = useState("");
  // const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  // const [currencyList, setCurrencyList] = useState<string[]>(DEFAULT_CURRENCIES);

  useEffect(() => {
    fetchProfile();
    // if (isAdmin) fetchCurrencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO: Click outside handler for currency dropdown (future)
  // useEffect(() => {
  //   if (!isCurrencyOpen) return;
  //   const handler = (e: MouseEvent) => {
  //     const target = e.target as HTMLElement;
  //     if (!target.closest(".currency-trigger") && !target.closest(".currency-dropdown")) {
  //       setIsCurrencyOpen(false);
  //       setCurrencySearch("");
  //     }
  //   };
  //   document.addEventListener("mousedown", handler);
  //   return () => document.removeEventListener("mousedown", handler);
  // }, [isCurrencyOpen]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data.data ?? res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Currency features (future)
  // const fetchCurrencies = async () => { ... };
  // const handleSaveCurrency = async (next: string) => { ... };
  // const filteredCurrencies = useMemo(() => ..., [currencyList, currencySearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-red-700 mb-1">
          Failed to load profile
        </h3>
        <p className="text-sm text-red-600">{error || "User data not found"}</p>
        <button
          onClick={fetchProfile}
          className="mt-4 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const fullName = user.fullName ?? user.name ?? "-";
  const userRole = user.role ?? role ?? "-";
  const isActive = user.isActive !== false;
  const merchant: MerchantData | null = user.merchant ?? null;
  const userCurrency = user.defaultCurrency ?? currency ?? "USD";

  /* ==================== ADMIN VIEW ==================== */
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className={PAGE_HEADER}>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              View and manage your account information
            </p>
          </div>
          <span
            className={`${BADGE} ${BADGE_COLORS[isActive ? "green" : "red"]}`}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-20 h-20 rounded-full bg-white p-1 shadow-md flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {fullName?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-1.5">
                    {fullName}
                    <CheckCircle size={16} className="text-blue-100" />
                  </h2>
                  <p className="text-sm text-blue-100 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm text-slate-500">Role</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">
              {userRole}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm text-slate-500">Joined</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">
              {formatDate(user.createdAt)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm text-slate-500">Status</p>
            <p
              className={`text-xl font-semibold mt-1 ${
                isActive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm text-slate-500">Currency</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">
              {userCurrency}
            </p>
            {/* TODO: Currency dropdown (future) */}
            {/* <button onClick={...}>...</button> */}
            {/* {isCurrencyOpen && (...)} */}
          </div>
        </div>

        {/* Account details */}
        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            Account Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
            <div>
              <SectionHeading title="Identity" />
              <Field label="Full Name" value={fullName} />
              <Field label="Email" value={user.email} />
              <Field label="Phone" value={user.phoneNumber} />
              <Field
                label="Email Verified"
                value={user.emailVerified ? "Yes" : "No"}
              />
            </div>
            <div>
              <SectionHeading title="Account" />
              <Field label="User ID" value={String(user.id)} />
              <Field label="Role" value={userRole} />
              <Field label="Created At" value={formatDate(user.createdAt)} />
              <Field label="Last Updated" value={formatDate(user.updatedAt)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==================== USER VIEW ==================== */
  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Profile & Merchant
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Your account and linked merchant record
          </p>
        </div>
        <span
          className={`${BADGE} ${BADGE_COLORS[isActive ? "green" : "red"]}`}
        >
          {isActive ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <div className="flex items-center gap-3 pb-4 mb-2 border-b border-slate-200">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                User
              </p>
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            </div>
          </div>

          <SectionHeading title="Identity" />
          <Field label="Full Name" value={fullName} />
          <Field label="Email" value={user.email} />
          <Field label="Phone" value={user.phoneNumber} />
          <Field
            label="Email Verified"
            value={user.emailVerified ? "Yes" : "No"}
          />

          <SectionHeading title="Security & Tenure" />
          <Field label="User ID" value={String(user.id)} />
          <Field label="Role" value={userRole} />
          <Field label="Member Since" value={formatDate(user.createdAt)} />
          <Field label="Last Updated" value={formatDate(user.updatedAt)} />
        </div>

        {/* Merchant Card OR Empty */}
        {merchant ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8">
            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-slate-200">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Store size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Business
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Merchant Details
                </h2>
              </div>
            </div>

            <SectionHeading title="Merchant Info" />
            <Field label="Merchant Name" value={merchant.name} />
            <Field label="Merchant ID" value={String(merchant.id)} />
            <Field label="Merchant Email" value={merchant.email} />
            <Field label="Phone" value={merchant.phone} />

            <SectionHeading title="Business Info" />
            <Field label="Business Name" value={merchant.businessName} />
            <Field label="Business Type" value={merchant.businessType} />
            <Field label="GSTIN" value={merchant.gstin} />
            <Field label="Registered" value={formatDate(merchant.createdAt)} />
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 flex flex-col items-center justify-center min-h-[320px]">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <Store className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-amber-800">
              No Merchant Linked
            </h3>
            <p className="text-sm text-amber-700 text-center max-w-xs mt-1">
              This account is not associated with any merchant yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}