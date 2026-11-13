import { useState, useEffect, useRef } from "react";
import api from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useCreateSettlement } from "../../api/mutations/settlementMutations";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  INPUT,
  LABEL,
  BTN_PRIMARY,
} from "../../lib/styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface User {
  id: number;
  email: string;
  fullName: string;
  merchantId: number;
  isActive?: boolean;
  merchant?: { id: number; name: string; businessName?: string };
}

interface MerchantDetails {
  id: number;
  name: string;
  email: string;
  businessName?: string;
  availableBalance?: number;
  unsettledAmount?: number;
  payoutBalance?: number;
}

export default function ManualSettlementReport({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState<"user-select" | "settlement-form">(
    "user-select",
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [merchantDetails, setMerchantDetails] =
    useState<MerchantDetails | null>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  const [amount, setAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { mutate: createSettlement, isPending: isCreating } =
    useCreateSettlement();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === "user-select") fetchUsers();
  }, [isOpen, step]);

  const resetForm = () => {
    setStep("user-select");
    setSelectedUser(null);
    setMerchantDetails(null);
    setAmount("");
    setAdminNote("");
    setError("");
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const response = await api.get("/users", {
        params: { role: "USER", isActive: true, limit: 100 },
      });

      let usersData: User[] = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      } else if (Array.isArray(response.data)) {
        usersData = response.data;
      }

      usersData = usersData.filter(
        (u) =>
          u.isActive !== false &&
          (!(u as any).role || (u as any).role === "USER"),
      );

      if (usersData.length === 0) {
        setError("No active merchant users found.");
      } else {
        setUsers(usersData);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load users",
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMerchantDetails = async (merchantId: number, userId: number) => {
    setLoadingMerchant(true);
    setError("");
    try {
      const merchantRes = await api.get(`/merchants/${merchantId}`);
      const merchant = merchantRes.data.data || merchantRes.data;

      const summaryRes = await api.get(
        `/settlements/summary/merchant/${merchantId}`,
        {
          params: { userId },
        },
      );
      const summary = summaryRes.data.data || {};

      setMerchantDetails({
        id: merchant.id,
        name: merchant.merchantName || "",
        email: merchant.email,
        businessName: merchant.businessName,
        availableBalance: summary.availableBalance || 0,
        unsettledAmount: summary.unsettledAmount || 0,
        payoutBalance: summary.payoutBalance || 0,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load merchant details",
      );
    } finally {
      setLoadingMerchant(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);
    if (user.merchantId) fetchMerchantDetails(user.merchantId, user.id);
    setStep("settlement-form");
  };

  const handleBackToUserSelect = () => {
    setStep("user-select");
    setSelectedUser(null);
    setMerchantDetails(null);
    setAmount("");
    setAdminNote("");
    setError("");
    fetchUsers();
  };

  const handleSubmit = () => {
    if (!selectedUser?.merchantId) {
      setError("No merchant selected");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    setError("");

    createSettlement(
      {
        merchantId: selectedUser.merchantId,
        userId: selectedUser.id,
        amount: amountNum,
        type: "WALLET_SETTLEMENT",
        notes: adminNote || "Manual WALLET_SETTLEMENT by admin",
      },
      {
        onSuccess: () => {
          setLoading(false);
          toast.success(
            `Settlement of ${formatCurrency(amountNum)} completed successfully!`,
          );
          resetForm();
          onSuccess?.();
          onClose();
        },
        onError: (err: any) => {
          setLoading(false);
          const msg =
            err.response?.data?.message || "Failed to process settlement";
          setError(msg);
          toast.error(msg);
        },
      },
    );
  };

  if (!isOpen) return null;

  // STEP 1 — User Select
  if (step === "user-select") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={`${MODAL_SHELL} max-w-md`}>
          <div className={MODAL_HEADER}>
            <h2 className="text-sm font-semibold text-slate-900">
              Initiate Settlement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a merchant user
            </p>
          </div>

          <div className={MODAL_BODY}>
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchUsers}
                  className="text-slate-900 underline font-medium ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="relative" ref={dropdownRef}>
              <label className={LABEL}>User</label>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`${INPUT} flex items-center justify-between text-left mt-1`}
                style={{ height: "38px" }}
              >
                <span
                  className={`truncate ${selectedUser ? "text-slate-900" : "text-slate-400"}`}
                >
                  {selectedUser
                    ? `${selectedUser.fullName} (${selectedUser.email})`
                    : "Select user..."}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 ml-2 flex-shrink-0 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="mt-1 bg-white rounded-md border border-slate-200 max-h-[240px] overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <div className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <p className="mt-1.5">Loading users...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-red-600 mb-2">
                        No merchant users found
                      </p>
                      <button
                        onClick={fetchUsers}
                        className="text-xs text-slate-900 underline font-medium"
                      >
                        Refresh
                      </button>
                    </div>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {user.fullName || user.email}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`${MODAL_FOOTER} !py-2`}>
            <button
              onClick={onClose}
              className="h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 — Settlement Form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${MODAL_SHELL} max-w-md`}>
        <div className={`${MODAL_HEADER} flex items-center justify-between`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Initiate Settlement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Wallet settlement</p>
          </div>
          <button
            onClick={handleBackToUserSelect}
            className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
          >
            Change user
          </button>
        </div>

        <div className={`${MODAL_BODY} min-h-[320px]`}>
          {selectedUser && (
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 mb-3">
              <p className="text-sm font-medium text-slate-900">
                {selectedUser.fullName}
              </p>
              <p className="text-xs text-slate-500">{selectedUser.email}</p>
              {merchantDetails && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Merchant:{" "}
                  {merchantDetails.name ||
                    selectedUser.merchant?.name ||
                    selectedUser.merchant?.businessName ||
                    "-"}
                </p>
              )}
            </div>
          )}

          {merchantDetails && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 bg-slate-100 rounded-md border border-slate-200">
                <p className="text-xs text-slate-500">Unsettled</p>
                <p className="text-base font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(merchantDetails.availableBalance || 0)}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-md border border-slate-200">
                <p className="text-xs text-slate-500">Payout Balance</p>
                <p className="text-base font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(merchantDetails.payoutBalance || 0)}
                </p>
              </div>
            </div>
          )}

          {loadingMerchant && (
            <div className="text-center text-xs text-slate-500 py-2">
              Loading balances...
            </div>
          )}

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className={LABEL}>Amount (INR)</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${INPUT} mt-1`}
                step="0.01"
                min="0.01"
              />
            </div>

            <div>
              <label className={LABEL}>Notes (optional)</label>
              <textarea
                placeholder="Admin note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className={`${INPUT} mt-1`}
                style={{
                  height: "auto",
                  minHeight: "60px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                }}
              />
            </div>
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || loadingMerchant || isCreating}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {loading || isCreating ? "Processing..." : "Submit Settlement"}
          </button>
        </div>
      </div>
    </div>
  );
}
