import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function KYCVerification({ formData, setFormData }: Props) {
  const set = (patch: any) => setFormData({ ...formData, ...patch });
  const inputCls = `${INPUT} h-12 text-base mt-1`;
  const labelCls = `${LABEL} text-sm`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg min-h-[560px] flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Bank Account Details
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Used for settlement processing. Must match your registration
          documents.
        </p>
      </div>
      <div className="p-8 grid md:grid-cols-2 gap-8 content-start flex-1">
        <div className="space-y-2">
          <label className={labelCls}>Bank Account Type</label>
          <select
            className={inputCls}
            value={formData.bankAccountType || ""}
            onChange={(e) => set({ bankAccountType: e.target.value })}
          >
            <option value="">Select account type</option>
            <option value="SAVINGS">Savings</option>
            <option value="CURRENT">Current</option>
            <option value="OD">Overdraft (OD)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Bank Account Name</label>
          <input
            className={inputCls}
            placeholder="Enter account holder name"
            value={formData.bankAccountName || ""}
            onChange={(e) => set({ bankAccountName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className={labelCls}>
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Enter account number"
            value={formData.accountNumber || ""}
            onChange={(e) => set({ accountNumber: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Enter IFSC code"
            value={formData.ifscCode || ""}
            onChange={(e) => set({ ifscCode: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Enter bank name"
            value={formData.bankName || ""}
            onChange={(e) => set({ bankName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Settlement Currency</label>
          <select
            className={inputCls}
            value={formData.settlementCurrency || "INR"}
            onChange={(e) => set({ settlementCurrency: e.target.value })}
          >
            <option value="INR">INR - Indian Rupee</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="VND">VND - Vietnamese Dong</option>
            <option value="PHP">PHP - Philippine Peso</option>
          </select>
        </div>
      </div>
    </div>
  );
}
