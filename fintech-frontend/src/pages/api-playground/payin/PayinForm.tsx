import { useState } from "react";
import { toast } from "sonner";
import { CARD, INPUT, LABEL, BTN_PRIMARY } from "../../../lib/styles";
import { apiPlaygroundService } from "../../../api/services/apiPlaygroundService";

export function PayinForm({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paymentMode: "UPI",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardHolderName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("Amount must be greater than 0");
    if (!form.customerName.trim())
      return toast.error("Customer name is required");
    if (!form.customerEmail.trim())
      return toast.error("Customer email is required");
    if (!form.customerPhone.trim())
      return toast.error("Customer phone is required");

    if (form.paymentMode === "CARD") {
      if (!form.cardNumber)
        return toast.error("Card number is required for CARD mode");
      if (!form.expiry || form.expiry.length < 7)
        return toast.error("Valid expiry MM/YYYY is required");
      if (!form.cvv) return toast.error("CVV is required");
      if (!form.cardHolderName)
        return toast.error("Card holder name is required");
    }

    setLoading(true);
    try {
      const payload: any = {
        amount: Number(form.amount),
        merchantReference: `ORD-${Date.now()}`,
        currency: "INR",
        paymentMode: form.paymentMode,
        customer: {
          name: form.customerName,
          email: form.customerEmail,
          phone: form.customerPhone,
        },
      };

      if (form.paymentMode === "CARD") {
        const [month, year] = form.expiry.split("/");
        payload.card = {
          cardNumber: form.cardNumber,
          expiryMonth: Number(month),
          expiryYear: Number(year),
          cvv: form.cvv,
          cardHolderName: form.cardHolderName,
        };
      }

      const res = await apiPlaygroundService.createPayin(payload);
      toast.success("Payin initiated successfully");
      onSuccess(res);
    } catch (error: any) {
      const msg = error.response?.data?.message || "";
      if (msg.toLowerCase().includes("duplicate")) {
        toast.error("Duplicate merchant reference! Please try again.");
      } else {
        toast.error(msg || "Failed to initiate Payin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isCard = form.paymentMode === "CARD";

  return (
    <div className={`${CARD} p-6 h-full flex flex-col`}>
      <h2 className="text-lg font-semibold mb-4">
        Enter amount to initiate payment
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        {/* Amount & Mode */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className={LABEL}>Amount</label>
            <input
              type="number"
              className={INPUT}
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL}>Payment Mode</label>
            <select
              className={INPUT}
              value={form.paymentMode}
              onChange={(e) =>
                setForm({ ...form, paymentMode: e.target.value })
              }
            >
              <option value="UPI">UPI</option>
              <option value="CARD">CARD</option>
            </select>
          </div>
        </div>

        {/* Card Fields - 2x2 Layout exactly as requested */}
        <div
          className={`grid grid-cols-2 gap-4 p-4 rounded-md transition ${isCard ? "bg-white border border-slate-200" : "bg-slate-50 opacity-50"}`}
        >
          {/* Row 1 */}
          <div>
            <label className={LABEL}>Card Number</label>
            <input
              disabled={!isCard}
              className={INPUT}
              placeholder="4242424242424242"
              value={form.cardNumber}
              onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Expiry (MM/YYYY)</label>
            <input
              disabled={!isCard}
              className={INPUT}
              placeholder="MM/YYYY"
              maxLength={7}
              value={form.expiry}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length > 2)
                  val = val.slice(0, 2) + "/" + val.slice(2, 6);
                setForm({ ...form, expiry: val });
              }}
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className={LABEL}>CVV</label>
            <input
              disabled={!isCard}
              className={INPUT}
              placeholder="123"
              maxLength={4}
              value={form.cvv}
              onChange={(e) => setForm({ ...form, cvv: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Card Holder Name</label>
            <input
              disabled={!isCard}
              className={INPUT}
              placeholder="Name on card"
              value={form.cardHolderName}
              onChange={(e) =>
                setForm({ ...form, cardHolderName: e.target.value })
              }
            />
          </div>
        </div>

        {/* Customer Fields - 3 in one row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Customer Name</label>
            <input
              className={INPUT}
              placeholder="Name"
              value={form.customerName}
              onChange={(e) =>
                setForm({ ...form, customerName: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input
              className={INPUT}
              placeholder="Email"
              value={form.customerEmail}
              onChange={(e) =>
                setForm({ ...form, customerEmail: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL}>Phone</label>
            <input
              className={INPUT}
              placeholder="Phone"
              value={form.customerPhone}
              onChange={(e) =>
                setForm({ ...form, customerPhone: e.target.value })
              }
            />
          </div>
        </div>

        <div className="pt-4 mt-auto">
          <button type="submit" disabled={loading} className={BTN_PRIMARY}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
