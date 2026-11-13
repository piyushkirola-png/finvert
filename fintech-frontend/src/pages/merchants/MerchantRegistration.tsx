// src/pages/merchants/MerchantRegistration.tsx
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { useCreateMerchant } from "../../api/mutations/merchantMutations";
import { useUpdateOnboardingMerchant } from "../../api/mutations/merchantOnboardingMutations";
import BasicInfo from "../merchant-onboarding/BasicInfo";
import BusinessInfo from "../merchant-onboarding/BusinessInfo";
import DocumentUpload from "../merchant-onboarding/DocumentUpload";
import KYCVerification from "../merchant-onboarding/KYCVerification";
import ReviewSubmit from "../merchant-onboarding/ReviewSubmit";

const STEPS = [
  "Introduction",
  "Basic Info",
  "Business Info",
  "Document Upload",
  "KYC Verification",
  "Review & Submit",
];
const LAST = STEPS.length - 1;

// Same mapping used by the onboarding flow so documents line up identically.
const DOCUMENT_MAPPING: Record<
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

export default function MerchantRegistration() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [localId, setLocalId] = useState<string | undefined>(undefined);

  const { mutate: createMerchant, isPending: isCreating } = useCreateMerchant();
  const { mutate: updateMerchant, isPending: isUpdating } =
    useUpdateOnboardingMerchant();

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

  const currentDocumentList = useMemo(
    () => DOCUMENT_MAPPING[formData.businessType] || [],
    [formData.businessType],
  );

  // Keep active document keys in sync with the selected business type
  // (preserving any custom docs already added).
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

  const saving = isCreating || isUpdating;

  // ========== VALIDATION ==========

  const canProceed = () => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return !!(formData.merchantName && formData.email && formData.phone);
      case 2:
        return !!(formData.businessName && formData.businessType);
      case 3:
        return true;
      case 4:
        return !!(
          formData.bankName &&
          formData.accountNumber &&
          formData.ifscCode
        );
      case 5: {
        const missing = currentDocumentList.filter(
          (d) => d.required && !documents[d.key]?.fileUrl,
        );
        return missing.length === 0;
      }
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    if (!canProceed()) {
      if (step === 5) {
        const missing = currentDocumentList
          .filter((d) => d.required && !documents[d.key]?.fileUrl)
          .map((d) => d.label);
        return toast.error(`Cannot submit. Upload: ${missing.join(", ")}`);
      }
      return toast.error(
        "Please complete all required fields before proceeding",
      );
    }

    // Step 1: Basic Info -> carry forward to Business Info
    if (step === 1) {
      setStep(2);
      return;
    }

    // Step 2: Business Info -> create merchant on first pass, else update
    if (step === 2) {
      if (!localId) {
        createMerchant(formData, {
          onSuccess: (res: any) => {
            const newId = res?.data?.id || res?.id;
            if (newId) setLocalId(String(newId));
            toast.success("Merchant created. Continue registration.");
            setStep(3);
          },
          onError: () => toast.error("Failed to create merchant"),
        });
      } else {
        updateMerchant(
          { id: localId, data: formData },
          {
            onSuccess: () => setStep(3),
            onError: () => toast.error("Failed to save business info"),
          },
        );
      }
      return;
    }

    // Step 3: Document Upload -> proceed
    if (step === 3) {
      setStep(4);
      return;
    }

    // Step 4: KYC -> persist then go to review
    if (step === 4) {
      updateMerchant(
        { id: localId || "", data: formData },
        {
          onSuccess: () => setStep(5),
          onError: () => toast.error("Failed to save KYC"),
        },
      );
      return;
    }

    // Step 5: Review & Submit
    if (step === LAST) {
      updateMerchant(
        { id: localId || "", data: formData },
        {
          onSuccess: () => {
            setSubmitted(true);
            toast.success("Registration submitted successfully!");
          },
          onError: () => toast.error("Failed to complete registration"),
        },
      );
    }
  };

  const handlePrevious = () => {
    if (step === 0) {
      navigate("/merchants");
    } else {
      setStep((s) => s - 1);
    }
  };

  // ========== SUCCESS SCREEN (kept from old layout) ==========

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg text-center"
        >
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Application Submitted!
          </h1>
          <p className="text-slate-500 text-lg mb-2">
            Thank you for registering with us.
          </p>
          <p className="text-slate-400 mb-6">
            Your application is under review. You will be notified once
            approved.
          </p>
          <button
            onClick={() => navigate("/merchants")}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Back to Merchants
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-8"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Store className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Merchant Registration
            </h1>
            <p className="text-sm text-slate-500">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step content — all rendered inside the same card size */}
        <div className="min-h-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {step === 0 && <IntroductionStep />}
              {step === 1 && (
                <BasicInfo formData={formData} setFormData={setFormData} />
              )}
              {step === 2 && (
                <BusinessInfo formData={formData} setFormData={setFormData} />
              )}
              {step === 3 && localId && (
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
              {step === 3 && !localId && (
                <div className="bg-white border border-slate-200 rounded-lg min-h-[560px] flex items-center justify-center">
                  <p className="text-sm text-slate-500">
                    Please complete Basic and Business info first.
                  </p>
                </div>
              )}
              {step === 4 && (
                <KYCVerification
                  formData={formData}
                  setFormData={setFormData}
                />
              )}
              {step === 5 && (
                <ReviewSubmit
                  formData={formData}
                  documents={documents}
                  documentList={currentDocumentList}
                  ips={[]}
                  rates={[]}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons (old footer layout) */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 transition"
          >
            <ArrowLeft size={18} />
            {step === 0 ? "Cancel" : "Previous"}
          </button>

          {step < LAST ? (
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : step === 0 ? "Get Started" : "Next"}{" "}
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit Registration"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function IntroductionStep() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg min-h-[560px] flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Welcome to Merchant Onboarding
          </h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Here's what you'll complete in this registration flow.
        </p>
      </div>

      <div className="p-8 flex-1 space-y-5">
        {/* What is KYC / onboarding cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              What is Merchant Onboarding?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              It's the process of registering your business with our payment
              gateway so you can accept online payments. It verifies your
              business identity, sets up payment methods, and configures your
              account.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              What is KYC?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              KYC (Know Your Customer) is the verification of your business and
              bank details. You'll upload documents like PAN, GST certificate,
              cancelled cheque, and bank statements so we can confirm your
              identity before activating payouts.
            </p>
          </div>
        </div>

        {/* Steps list */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">
            What you'll complete
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Basic Info — name, email, phone, webhook",
              "Business Info — legal name, type, GSTIN, address",
              "Document Upload — KYC documents per business type",
              "KYC Verification — bank account & settlement details",
              "Review & Submit — confirm everything and finish",
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-slate-50 rounded-lg p-3"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">
            Secure & Compliant — your data is handled safely.
          </span>
        </div>
      </div>
    </div>
  );
}
