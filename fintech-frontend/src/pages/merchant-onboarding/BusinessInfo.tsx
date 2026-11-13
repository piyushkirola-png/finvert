import { INPUT, LABEL } from "../../lib/styles";
import DatePicker from "../../components/ui/DatePicker";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

// "15-03-2024" -> Date
const parseDDMMYYYY = (s?: string): Date | null => {
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
};

// Date -> "15-03-2024"
const toDDMMYYYY = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export default function BusinessInfo({ formData, setFormData }: Props) {
  const set = (patch: any) => setFormData({ ...formData, ...patch });
  const inputCls = `${INPUT} h-11 text-sm`;
  const labelCls = `${LABEL} text-sm`;

  const zoneOptions = ["North", "West", "East", "South"];
  const gstStatusOptions = [
    "Registered",
    "Unregistered",
    "Composition Scheme",
    "GST Registration Applied",
    "Exempted",
  ];
  const categoryOptions = [
    "E-commerce / Online Shopping",
    "Education & E-learning",
    "Healthcare & Medical",
    "Food & Restaurant",
    "Financial Services",
    "Gaming & Entertainment",
    "Logistics & Transportation",
    "Digital Products & Downloads",
    "Other",
  ];
  const employeeOptions = ["1-10", "11-50", "50-100", "100-250", "250-500"];
  const turnoverOptions = [
    "Below ₹1 Crore",
    "₹1 Crore – ₹5 Crore",
    "₹5 Crore – ₹10 Crore",
    "₹10 Crore – ₹25 Crore",
    "₹25 Crore – ₹50 Crore",
    "₹50 Crore – ₹100 Crore",
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg min-h-[400px] flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Business Information
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Used for KYC verification. Please provide accurate details.
        </p>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-5 flex-1">
        <div className="space-y-2">
          <label className={labelCls}>
            Legal Business Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Enter legal name"
            value={formData.businessName || ""}
            onChange={(e) => set({ businessName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Website URL</label>
          <input
            className={inputCls}
            placeholder="https://example.com"
            value={formData.websiteUrl || ""}
            onChange={(e) => set({ websiteUrl: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Business Type</label>
          <select
            className={inputCls}
            value={formData.businessType || ""}
            onChange={(e) => set({ businessType: e.target.value })}
          >
            <option value="">Select business type</option>
            <option value="PRIVATE_LIMITED">
              Private Limited Company (Pvt. Ltd.)
            </option>
            <option value="LLP">Limited Liability Partnership (LLP)</option>
            <option value="PARTNERSHIP">Partnership Firm</option>
            <option value="SOLE_PROPRIETORSHIP">Proprietorship Firm</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className={labelCls}>Contact Person Name</label>
          <input
            className={inputCls}
            placeholder="Enter contact person"
            value={formData.contactPerson || ""}
            onChange={(e) => set({ contactPerson: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Phone Number</label>
          <input
            className={inputCls}
            placeholder="Enter phone"
            value={formData.businessPhone || ""}
            onChange={(e) => set({ businessPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Business Email</label>
          <input
            type="email"
            className={inputCls}
            placeholder="Enter email"
            value={formData.businessEmail || ""}
            onChange={(e) => set({ businessEmail: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className={labelCls}>Business Address</label>
          <input
            className={inputCls}
            placeholder="Enter full address"
            value={formData.businessAddress || ""}
            onChange={(e) => set({ businessAddress: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>City</label>
          <input
            className={inputCls}
            placeholder="City"
            value={formData.city || ""}
            onChange={(e) => set({ city: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className={labelCls}>State</label>
          <input
            className={inputCls}
            placeholder="State"
            value={formData.state || ""}
            onChange={(e) => set({ state: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>PIN Code</label>
          <input
            className={inputCls}
            placeholder="PIN Code"
            value={formData.pinCode || ""}
            onChange={(e) => set({ pinCode: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Zone</label>
          <select
            className={inputCls}
            value={formData.zone || ""}
            onChange={(e) => set({ zone: e.target.value })}
          >
            <option value="">Select Zone</option>
            {zoneOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className={labelCls}>PAN Number</label>
          <input
            className={inputCls}
            placeholder="Enter PAN"
            value={formData.panNumber || ""}
            onChange={(e) => set({ panNumber: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Name as per PAN</label>
          <input
            className={inputCls}
            placeholder="Enter name"
            value={formData.nameAsPerPan || ""}
            onChange={(e) => set({ nameAsPerPan: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Incorporation Date</label>
          <DatePicker
            value={parseDDMMYYYY(formData.incorporationDate)}
            placeholder="DD-MM-YYYY"
            onChange={(d) => set({ incorporationDate: d ? toDDMMYYYY(d) : "" })}
          />
        </div>

        <div className="space-y-2">
          <label className={labelCls}>GSTIN / Tax ID</label>
          <input
            className={inputCls}
            placeholder="Enter GSTIN"
            value={formData.gstin || ""}
            onChange={(e) => set({ gstin: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>GST Status</label>
          <select
            className={inputCls}
            value={formData.gstStatus || ""}
            onChange={(e) => set({ gstStatus: e.target.value })}
          >
            <option value="">Select GST Status</option>
            {gstStatusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Merchant Category</label>
          <select
            className={inputCls}
            value={formData.merchantCategory || ""}
            onChange={(e) => set({ merchantCategory: e.target.value })}
          >
            <option value="">Select Category</option>
            {categoryOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className={labelCls}>Business Operating Country</label>
          <input
            className={inputCls}
            placeholder="e.g. India"
            value={formData.operatingCountry || ""}
            onChange={(e) => set({ operatingCountry: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Annual Turnover</label>
          <select
            className={inputCls}
            value={formData.annualTurnover || ""}
            onChange={(e) => set({ annualTurnover: e.target.value })}
          >
            <option value="">Select Turnover</option>
            {turnoverOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Number of Employees</label>
          <select
            className={inputCls}
            value={formData.numberOfEmployees || ""}
            onChange={(e) => set({ numberOfEmployees: e.target.value })}
          >
            <option value="">Select Employees</option>
            {employeeOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
