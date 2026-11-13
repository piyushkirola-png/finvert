import { useState } from "react";
import { toast } from "sonner";
import { CARD, INPUT, LABEL, BTN_PRIMARY } from "../../../lib/styles";
import { apiPlaygroundService } from "../../../api/services/apiPlaygroundService";

export function PayoutForm() {
  const [loading, setLoading] = useState(false);
  const [fetchingIfsc, setFetchingIfsc] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    name: "",
    accountType: "SAVINGS",
    accountNumber: "",
    bankName: "",
    ifsc: "",
    branch: "",
    mobile: "",
    email: "",
    address: "",
  });

  const handleIfscChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ifsc = e.target.value.toUpperCase().slice(0, 11);
    setForm({ ...form, ifsc });

    if (ifsc.length === 11) {
      setFetchingIfsc(true);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (res.ok) {
          const data = await res.json();
          setForm((prev) => ({
            ...prev,
            bankName: data.BANK || prev.bankName,
            branch: data.BRANCH || prev.branch,
          }));
          toast.success("Bank details auto-filled");
        } else {
          toast.error("Invalid IFSC code. Bank not found.");
        }
      } catch (error) {
        console.error("IFSC lookup failed", error);
      } finally {
        setFetchingIfsc(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("Amount must be greater than 0");
    if (!form.name.trim()) return toast.error("Beneficiary name is required");
    if (form.accountNumber.length < 9 || form.accountNumber.length > 18)
      return toast.error("Account number must be 9-18 digits");
    if (form.ifsc.length !== 11)
      return toast.error("IFSC must be exactly 11 characters");
    if (!form.bankName.trim()) return toast.error("Bank name is required");

    setLoading(true);
    try {
      const payload = {
        amount: Number(form.amount),
        merchantReference: `PAYOUT-${Date.now()}`,
        paymentMode: "BANK",
        beneficiary: {
          name: form.name,
          accountNumber: form.accountNumber,
          bankName: form.bankName,
          ifsc: form.ifsc,
          email: form.email || undefined,
          mobile: form.mobile || undefined,
        },
      };
      await apiPlaygroundService.createPayout(payload);
      toast.success("Payout initiated successfully!");

      // Reset form after success (optional)
      setForm({
        amount: "",
        name: "",
        accountType: "SAVINGS",
        accountNumber: "",
        bankName: "",
        ifsc: "",
        branch: "",
        mobile: "",
        email: "",
        address: "",
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || "";
      if (msg.toLowerCase().includes("insufficient")) {
        toast.error("Insufficient wallet balance.");
      } else if (msg.toLowerCase().includes("duplicate")) {
        toast.error("Duplicate merchant reference.");
      } else {
        toast.error(msg || "Failed to initiate payout");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reusable Input Class with taller height (h-11)
  const inputCls = `${INPUT} h-11 text-sm`;

  return (
    <div className={`${CARD} p-8`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Row 1 */}
          <div>
            <label className={LABEL}>
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              className={inputCls}
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>
              Beneficiary Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className={inputCls}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              className={inputCls}
              value={form.accountType}
              onChange={(e) =>
                setForm({ ...form, accountType: e.target.value })
              }
            >
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
              <option value="OD">Overdraft (OD)</option>
            </select>
          </div>

          {/* Row 2 */}
          <div>
            <label className={LABEL}>
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              required
              className={inputCls}
              placeholder="9-18 digits"
              maxLength={18}
              value={form.accountNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  accountNumber: e.target.value.replace(/\D/g, ""),
                })
              } // Only numbers
            />
          </div>
          <div>
            <label className={LABEL}>
              IFSC <span className="text-red-500">*</span>
            </label>
            <input
              required
              className={inputCls}
              placeholder="e.g. HDFC0001234"
              maxLength={11}
              value={form.ifsc}
              onChange={handleIfscChange}
              disabled={fetchingIfsc}
            />
            {fetchingIfsc && (
              <p className="text-[10px] text-blue-500 mt-1">
                Detecting bank...
              </p>
            )}
          </div>
          <div>
            <label className={LABEL}>
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className={inputCls}
              placeholder="Auto-fills with IFSC"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>

          {/* Row 3 */}
          <div>
            <label className={LABEL}>Branch</label>
            <input
              className={inputCls}
              placeholder="Auto-fills with IFSC"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Mobile</label>
            <input
              className={inputCls}
              placeholder="10 digits"
              maxLength={10}
              value={form.mobile}
              onChange={(e) =>
                setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })
              }
            />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input
              type="email"
              className={inputCls}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Address</label>
          <textarea
            className={`${inputCls} h-24 resize-none`}
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || fetchingIfsc}
            className={BTN_PRIMARY}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
