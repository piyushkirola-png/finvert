import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { getCurrencySymbol } from "../../utils/currencySymbols";
import {
  useOnboardingMerchant,
  useOnboardingDocuments,
  useOnboardingRates,
  useOnboardingGateways,
  useOnboardingIPs,
} from "../../api/queries/useMerchantOnboarding";
import { useUpdateOnboardingMerchant } from "../../api/mutations/merchantOnboardingMutations";
import { useCreateMerchant } from "../../api/mutations/merchantMutations";
import BasicInfo from "./BasicInfo";
import BusinessInfo from "./BusinessInfo";
import DocumentUpload from "./DocumentUpload";
import KYCVerification from "./KYCVerification";
import IPWhitelisting from "./IPWhitelisting";
import RateManagement from "./RateManagement";
import ReviewSubmit from "./ReviewSubmit";
import { PAGE_HEADER } from "../../lib/styles";

const STEPS = [
  "Basic Info",
  "Business Info",
  "Document Upload",
  "KYC Verification",
  "IP Whitelisting",
  "Rate Management",
  "Review & Submit",
];
const LAST = STEPS.length - 1;

export const DOCUMENT_MAPPING: Record<
  string,
  Array<{ key: string; label: string; required: boolean }>
> = {
  PRIVATE_LIMITED: [
    { key: "companyPan", label: "Company PAN Card", required: true },
    {
      key: "incorporationCert",
      label: "Certificate of Incorporation",
      required: true,
    },
    { key: "moa", label: "Memorandum of Association (MOA)", required: true },
    { key: "aoa", label: "Articles of Association (AOA)", required: true },
    { key: "boardResolution", label: "Board Resolution", required: true },
    { key: "gstCert", label: "GST Registration Certificate", required: true },
    {
      key: "addressProof",
      label: "Company Address Proof (Utility Bill / Rent Agreement)",
      required: true,
    },
    {
      key: "cancelledCheque",
      label: "Cancelled Cheque of Company's Bank Account",
      required: true,
    },
    {
      key: "bankStatement",
      label: "Last 3 Months Bank Statement",
      required: true,
    },
  ],
  PARTNERSHIP: [
    {
      key: "partnershipPan",
      label: "Partnership Firm PAN Card",
      required: true,
    },
    {
      key: "partnershipCert",
      label: "Partnership Registration Certificate",
      required: true,
    },
    { key: "partnershipDeed", label: "Partnership Deed", required: true },
    { key: "gstCert", label: "GST Registration Certificate", required: true },
    {
      key: "addressProof",
      label: "Firm Address Proof (Utility Bill / Rent Agreement)",
      required: true,
    },
    {
      key: "cancelledCheque",
      label: "Cancelled Cheque of Firm's Bank Account",
      required: true,
    },
    {
      key: "bankStatement",
      label: "Last 3 Months Bank Statement",
      required: true,
    },
  ],
  SOLE_PROPRIETORSHIP: [
    {
      key: "udyamCert",
      label: "Udyam or MSME Registration Certificate",
      required: true,
    },
    { key: "gstCert", label: "GST Registration Certificate", required: true },
    {
      key: "addressProof",
      label: "Business Address Proof (Utility Bill / Rent Agreement)",
      required: true,
    },
    {
      key: "cancelledCheque",
      label: "Cancelled Cheque of Business Bank Account",
      required: true,
    },
    {
      key: "bankStatement",
      label: "Last 3 Months Bank Statement",
      required: true,
    },
  ],
  LLP: [
    { key: "companyPan", label: "Company PAN Card", required: true },
    {
      key: "incorporationCert",
      label: "Certificate of Incorporation",
      required: true,
    },
    { key: "moa", label: "Memorandum of Association (MOA)", required: true },
    { key: "aoa", label: "Articles of Association (AOA)", required: true },
    { key: "boardResolution", label: "Board Resolution", required: true },
    { key: "gstCert", label: "GST Registration Certificate", required: true },
    {
      key: "addressProof",
      label: "Company Address Proof (Utility Bill / Rent Agreement)",
      required: true,
    },
    {
      key: "cancelledCheque",
      label: "Cancelled Cheque of Company's Bank Account",
      required: true,
    },
    {
      key: "bankStatement",
      label: "Last 3 Months Bank Statement",
      required: true,
    },
  ],
};

const documentTypeMap: Record<string, string> = {
  companyPan: "PAN",
  incorporationCert: "INCORPORATION_CERT",
  moa: "MOA",
  aoa: "AOA",
  boardResolution: "BOARD_RESOLUTION",
  gstCert: "GST",
  addressProof: "ADDRESS_PROOF",
  cancelledCheque: "CANCELLED_CHEQUE",
  bankStatement: "BANK_STATEMENT",
  partnershipPan: "PAN",
  partnershipCert: "PARTNERSHIP_CERT",
  partnershipDeed: "PARTNERSHIP_DEED",
  udyamCert: "UDYAM_CERT",
};

export default function MerchantOnboarding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  let userCurrency = "INR";
  try {
    const user = JSON.parse(localStorage.getItem("admin_user") || "null");
    if (user?.defaultCurrency) userCurrency = user.defaultCurrency;
  } catch {
    /* ignore */
  }
  const currencySymbol = getCurrencySymbol(userCurrency);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [localId, setLocalId] = useState<string | undefined>(id);

  const {
    data: merchant,
    isLoading: merchantLoading,
    refetch: refetchMerchant,
  } = useOnboardingMerchant(localId || "");
  const { data: docs = [] } = useOnboardingDocuments(localId || "");
  const { data: apiRates = [], refetch: refetchRates } = useOnboardingRates(
    localId || "",
  );
  const { data: gateways = [] } = useOnboardingGateways();
  const { data: apiIPs = [], refetch: refetchIPs } = useOnboardingIPs(
    localId || "",
  );

  const { mutate: updateMerchant, isPending: isUpdating } =
    useUpdateOnboardingMerchant();
  const { mutate: createMerchant, isPending: isCreating } = useCreateMerchant();

  const [formData, setFormData] = useState<any>({
    merchantName: "",
    email: "",
    phone: "",
    webhookUrl: "",
    webhookSecret: "",
    status: "ACTIVE",
    businessName: "",
    websiteUrl: "",
    businessType: "",
    gstin: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    settlementCurrency: "INR",
    contactPerson: "",
    businessAddress: "",
    city: "",
    state: "",
    pinCode: "",
    businessPhone: "",
    panNumber: "",
    nameAsPerPan: "",
    incorporationDate: "",
    gstStatus: "",
    businessEmail: "",
    merchantCategory: "",
    annualTurnover: "",
    zone: "",
    operatingCountry: "",
    numberOfEmployees: "",
    bankAccountType: "",
    bankAccountName: "",
  });

  const [documents, setDocuments] = useState<Record<string, any>>({});
  const [activeDocs, setActiveDocs] = useState<string[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [localIPs, setLocalIPs] = useState<string[]>([]);

  // Track highest completed step to lock tabs
  const [highestStep, setHighestStep] = useState(0);

  const currentDocumentList = useMemo(() => {
    return DOCUMENT_MAPPING[formData.businessType] || [];
  }, [formData.businessType]);

  useEffect(() => {
    if (currentDocumentList.length > 0) {
      const existingCustomKeys = Object.keys(documents).filter((k) =>
        k.startsWith("custom_"),
      );
      const newActive = currentDocumentList.map((d) => d.key);
      setActiveDocs([...newActive, ...existingCustomKeys]);
    } else {
      setActiveDocs(
        Object.keys(documents).filter((k) => k.startsWith("custom_")),
      );
    }
  }, [currentDocumentList]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!merchantLoading && merchant) {
      setFormData((prev: any) => ({ ...prev, ...merchant }));
      setLoading(false);
    }
  }, [merchant, merchantLoading, isNew]);

  useEffect(() => {
    if (docs.length === 0) return;
    const formatted: Record<string, any> = {};
    docs.forEach((doc: any) => {
      if (doc.type === "CUSTOM_DOCUMENT") {
        if (!doc.customName) return;
        const key = `custom_${doc.customName}`;
        formatted[key] = {
          fileUrl: doc.fileUrl,
          fileName: doc.fileName || "uploaded file",
          type: doc.type,
          customName: doc.customName,
          isCustom: true,
          fileId: doc.id,
          status: doc.status || "PENDING",
        };
      } else {
        const key = Object.keys(documentTypeMap).find(
          (k) => documentTypeMap[k] === doc.type,
        );
        if (key) {
          formatted[key] = {
            fileUrl: doc.fileUrl,
            fileName: doc.fileName || "uploaded file",
            type: doc.type,
            fileId: doc.id,
            status: doc.status || "PENDING",
          };
        }
      }
    });
    setDocuments(formatted);
  }, [docs]);

  useEffect(() => {
    if (apiRates.length > 0) setRates(apiRates);
  }, [apiRates]);
  useEffect(() => {
    if (apiIPs.length > 0) setLocalIPs(apiIPs);
  }, [apiIPs]);

  const handleNext = async () => {
    if (step === 0) {
      if (!formData.merchantName || !formData.email || !formData.phone) {
        return toast.error("Please fill required fields (Name, Email, Phone)");
      }
      setStep(1);
      setHighestStep(Math.max(highestStep, 1));
      return;
    }

    if (step === 1) {
      if (isNew && !localId) {
        if (!formData.businessName || !formData.businessType)
          return toast.error("Please fill required fields");
        createMerchant(formData, {
          onSuccess: (res: any) => {
            const newId = res?.data?.id || res?.id;
            if (newId) {
              setLocalId(String(newId));
              window.history.replaceState(
                null,
                "",
                `/merchant-onboarding/${newId}`,
              );
              toast.success("Merchant created. Continue onboarding.");
              setStep(2);
              setHighestStep(Math.max(highestStep, 2));
            }
          },
          onError: () => toast.error("Failed to create merchant"),
        });
      } else {
        updateMerchant(
          { id: localId || "", data: formData },
          {
            onSuccess: () => {
              refetchMerchant();
              setStep(2);
              setHighestStep(Math.max(highestStep, 2));
            },
            onError: () => toast.error("Failed to save business info"),
          },
        );
      }
      return;
    }

    if (step === 3) {
      // KYC
      updateMerchant(
        { id: localId || "", data: formData },
        {
          onSuccess: () => {
            refetchMerchant();
            setStep(4);
            setHighestStep(Math.max(highestStep, 4));
          },
          onError: () => toast.error("Failed to save KYC"),
        },
      );
      return;
    }

    // Doc, IP, Rate just proceed
    if (step < LAST) {
      setStep((s) => s + 1);
      setHighestStep(Math.max(highestStep, step + 1));
    } else {
      const missing = currentDocumentList
        .filter((d) => d.required && !documents[d.key]?.fileUrl)
        .map((d) => d.label);
      if (missing.length > 0) {
        toast.error(`Cannot submit. Upload: ${missing.join(", ")}`);
        setStep(2);
        return;
      }
      toast.success("Onboarding complete");
      navigate("/merchants");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );

  const saving = isUpdating || isCreating;

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Merchant Onboarding
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {formData.merchantName
              ? `Onboarding ${formData.merchantName}`
              : "Add a new merchant and complete their onboarding"}
          </p>
        </div>
        <div className="text-sm font-medium text-slate-500">
          Step {step + 1} of {STEPS.length}
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {STEPS.map((label, index) => {
          const isLocked = index > highestStep;
          return (
            <button
              key={label}
              disabled={isLocked}
              onClick={() => setStep(index)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                step === index
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${step === index ? "bg-white text-slate-900" : "bg-slate-200 text-slate-600"}`}
              >
                {index + 1}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {step === 0 && (
          <BasicInfo formData={formData} setFormData={setFormData} />
        )}
        {step === 1 && (
          <BusinessInfo formData={formData} setFormData={setFormData} />
        )}
        {step === 2 && localId && (
          <DocumentUpload
            documents={documents}
            setDocuments={setDocuments}
            activeDocs={activeDocs}
            setActiveDocs={setActiveDocs}
            documentList={currentDocumentList}
            documentTypeMap={documentTypeMap}
            merchantId={localId}
          />
        )}
        {step === 3 && (
          <KYCVerification formData={formData} setFormData={setFormData} />
        )}
        {step === 4 && (
          <IPWhitelisting
            whitelistedIPs={localIPs}
            setWhitelistedIPs={setLocalIPs}
            merchantId={localId}
            refetchIPs={refetchIPs}
          />
        )}
        {step === 5 && (
          <RateManagement
            rates={rates}
            setRates={setRates}
            gateways={gateways}
            merchantId={localId}
            merchant={merchant}
            currencySymbol={currencySymbol}
            refetchRates={refetchRates}
          />
        )}
        {step === 6 && (
          <ReviewSubmit
            formData={formData}
            documents={documents}
            documentList={currentDocumentList}
            ips={localIPs}
            rates={rates}
          />
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200 mt-6">
        <button
          onClick={() =>
            step === 0 ? navigate("/merchants") : setStep((s) => s - 1)
          }
          className="h-10 px-5 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
        >
          {step === 0 ? "Cancel" : "Previous"}
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="h-10 px-6 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : step === 0
              ? "Save & Continue"
              : step === LAST
                ? "Complete Onboarding"
                : "Continue"}
        </button>
      </div>
    </div>
  );
}
