import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function BasicInfo({ formData, setFormData }: Props) {
  const set = (patch: any) => setFormData({ ...formData, ...patch });
  const inputCls = `${INPUT} h-11 text-sm`;
  const labelCls = `${LABEL} text-sm`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg min-h-[560px] flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Basic Information
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Primary details used to create the merchant account
        </p>
      </div>
      <div className="p-8 grid md:grid-cols-2 gap-8 content-start flex-1">
        <div className="space-y-1.5">
          <label className={labelCls}>
            Merchant Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Enter merchant name"
            value={formData.merchantName || ""}
            onChange={(e) => set({ merchantName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className={inputCls}
            placeholder="merchant@example.com"
            value={formData.email || ""}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Enter phone number"
            value={formData.phone || ""}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Status</label>
          <select
            className={inputCls}
            value={formData.status || "ACTIVE"}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Webhook URL</label>
          <input
            className={inputCls}
            placeholder="https://example.com/webhook"
            value={formData.webhookUrl || ""}
            onChange={(e) => set({ webhookUrl: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Webhook Secret</label>
          <input
            type="password"
            className={inputCls}
            placeholder="Enter webhook secret"
            value={formData.webhookSecret || ""}
            onChange={(e) => set({ webhookSecret: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
