import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { Check, RefreshCw } from "lucide-react";
import { useAuth } from "../../components/context/AuthContext";
import type { Role } from "../../types/auth";

const GATEWAYS = [
  { name: "Airpay", src: "/gateways/airpay.png" },
  { name: "PayPal", src: "/gateways/paypal.png" },
  { name: "Google Pay", src: "/gateways/gpay.png" },
  { name: "Cashfree", src: "/gateways/cashfree.png" },
  { name: "Easebuzz", src: "/gateways/easebuzz.png" },
  { name: "Paytm", src: "/gateways/paytm.png" },
  { name: "PayU", src: "/gateways/payu.png" },
  { name: "PhonePe", src: "/gateways/phonepe.png" },
  { name: "Razorpay", src: "/gateways/razorpay.png" },
  { name: "SabPaisa", src: "/gateways/sabpaisa.png" },
  { name: "Stripe", src: "/gateways/stripe.png" },
];

const MARQUEE = [...GATEWAYS, ...GATEWAYS];

const FEATURES = [
  "Single API Integration",
  "Smart Payment Routing",
  "Unified Payment API",
  "Real-Time Analytics",
  "Automated Reconciliation",
];

const MARQUEE_STYLES = `
@keyframes dcvpay-marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.dcvpay-marquee-track {
  display: flex;
  width: max-content;
  animation: dcvpay-marquee 25s linear infinite;
  will-change: transform;
}
`;

const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateCaptcha = (length = 5) => {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return out;
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState<Role>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState<string>(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const isAdmin = role === "ADMIN";

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || showSuccess) return;

    if (captchaInput.trim().toUpperCase() !== captcha) {
      setErrorMessage("Invalid captcha. Please try again.");
      refreshCaptcha();
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      await login({ email, password }, role);
      setShowSuccess(true);
      refreshCaptcha();
      // Wait 2 seconds on the splash screen before redirecting
      redirectTimer.current = setTimeout(
        () => navigate("/dashboard", { replace: true }),
        2000,
      );
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Invalid credentials",
      );
      refreshCaptcha();
      setLoading(false);
    }
  };

  const switchRole = () => {
    setRole(isAdmin ? "USER" : "ADMIN");
    setErrorMessage("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    refreshCaptcha();
  };

  const inputCls =
    "w-full px-4 py-3.5 border border-gray-300 rounded-lg text-[15px] text-gray-900 placeholder:text-gray-400 placeholder:text-[15px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white";

  const emailField = (
    <div className="space-y-2">
      <label htmlFor="email" className="text-[15px] font-medium text-gray-700">
        Email Address
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={inputCls}
      />
    </div>
  );

  const passwordField = (
    <div className="space-y-2">
      <label
        htmlFor="password"
        className="text-[15px] font-medium text-gray-700"
      >
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={`${inputCls} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {showPassword ? "hide" : "show"}
        </button>
      </div>
    </div>
  );

  const captchaField = (
    <div className="space-y-2">
      <label
        htmlFor="captcha"
        className="text-[15px] font-medium text-gray-700"
      >
        Captcha
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={refreshCaptcha}
          title="Click to change captcha"
          aria-label="Refresh captcha"
          className="select-none shrink-0 px-5 py-3 rounded-lg border border-gray-300 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 font-mono text-lg font-bold tracking-[0.35em] text-gray-800 italic shadow-inner hover:from-gray-200 hover:to-gray-200 transition-colors"
          style={{
            textDecoration: "line-through",
            textDecorationColor: "rgba(0,0,0,0.25)",
          }}
        >
          {captcha}
        </button>

        <button
          type="button"
          onClick={refreshCaptcha}
          aria-label="Refresh captcha"
          className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <RefreshCw size={18} />
        </button>

        <input
          id="captcha"
          type="text"
          autoComplete="off"
          placeholder="Enter captcha"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          required
          maxLength={5}
          className={inputCls}
        />
      </div>
    </div>
  );

  const errorBox = errorMessage && (
    <div
      role="alert"
      className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100"
    >
      {errorMessage}
    </div>
  );

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    captchaInput.trim().length > 0;

  return (
    <>
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[999] bg-[#FAF6EF] flex flex-col items-center justify-center"
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              src={logo}
              alt="Loading..."
              className="w-24 h-24 object-contain mb-6"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <h2 className="text-xl font-bold text-gray-800">Welcome Back</h2>
              <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="w-full h-full bg-blue-600 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN LOGIN PAGE ================= */}
      <div className="relative min-h-screen flex w-full bg-[#FAF6EF] font-sans overflow-hidden">
        <style>{MARQUEE_STYLES}</style>

        {/* ================= LEFT PANEL ================= */}
        <motion.div
          initial={false}
          animate={{
            width: isAdmin ? "50%" : "33.333%",
            backgroundColor: isAdmin ? "#1C1C1E" : "#0B1B4D",
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="hidden lg:flex flex-col relative overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            {!isAdmin ? (
              <motion.div
                key="user-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full w-full p-8 min-w-0"
              >
                <div className="flex items-center gap-3 mt-6 mb-10 justify-center shrink-0">
                  <img
                    src={logo}
                    alt="DCvPay logo"
                    className="w-10 h-10 object-contain"
                  />
                  <h1 className="text-white text-3xl font-bold tracking-wide">
                    DCvPay
                  </h1>
                </div>

                <h2 className="text-white text-2xl font-bold mb-8 text-center">
                  Why Choose DCvPay Payment Solution?
                </h2>

                <ul className="space-y-5">
                  {FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-white text-lg whitespace-nowrap"
                    >
                      <span className="bg-emerald-400 rounded-full p-1 shrink-0 mt-1">
                        <Check
                          size={13}
                          className="text-[#0B1B4D]"
                          strokeWidth={3}
                        />
                      </span>
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pb-8 w-full">
                  <p className="text-white text-lg font-bold mb-4">
                    Trusted by the fastest growing brands in the country
                  </p>
                  <div className="relative w-full overflow-hidden">
                    <div className="dcvpay-marquee-track">
                      {MARQUEE.map((g, i) => (
                        <div
                          key={i}
                          className="bg-white rounded-xl p-3 h-24 w-40 mr-6 flex items-center justify-center shadow-sm shrink-0"
                        >
                          <img
                            src={g.src}
                            alt={g.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="admin-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full w-full p-12 min-w-0"
              >
                <div className="flex items-center gap-4 shrink-0">
                  <img
                    src={logo}
                    alt="DCvPay logo"
                    className="w-14 h-14 object-contain"
                  />
                  <div>
                    <h1 className="text-white text-4xl font-bold leading-none tracking-tight">
                      Dcvpay
                    </h1>
                    <p className="text-gray-400 text-sm tracking-[0.3em] uppercase font-semibold mt-2">
                      Payment Orchestration
                    </p>
                  </div>
                </div>

                <div className="mt-6 pl-6 pr-4 shrink-0">
                  <h2 className="text-4xl font-bold text-white mb-4">
                    Future-ready financial infrastructure
                  </h2>
                  <p className="text-base text-gray-300 leading-relaxed">
                    Orchestrate payments, automate settlements, monitor fraud
                    activity, manage merchants, and scale your financial
                    ecosystem from one intelligent dashboard.
                  </p>
                </div>

                <div className="flex items-center justify-center w-full relative py-4 flex-1">
                  <div className="absolute w-[80%] h-[80%] bg-purple-500/20 blur-[110px] rounded-full pointer-events-none" />
                  <img
                    src="/hero.png"
                    alt="Admin dashboard illustration"
                    className="relative max-h-[520px] w-auto object-contain drop-shadow-2xl"
                  />
                </div>

                <p className="text-white font-bold text-[13px] leading-relaxed text-center px-2 mb-6 whitespace-nowrap">
                  AI-powered fraud detection, real-time transaction analytics,
                  seamless multi-gateway routing, and automated settlements
                  &amp; reconciliation.
                </p>

                <div className="flex items-center justify-between text-sm font-semibold text-gray-400 border-t border-white/10 pt-4">
                  <span>© 2026 DCvPay</span>
                  <div className="flex items-center gap-6">
                    <span className="text-white">Secure Access</span>
                    <span className="text-white">Enterprise Grade</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FAF6EF] relative z-20">
          <AnimatePresence mode="wait" initial={false}>
            {!isAdmin ? (
              <motion.div
                key="user-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-[500px]"
              >
                <div className="flex items-center justify-center gap-2 mb-6">
                  <img
                    src={logo}
                    alt="DCvPay logo"
                    className="w-12 h-12 object-contain"
                  />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
                  Welcome back
                </h2>
                <p className="text-gray-500 text-center mb-8 text-base">
                  Access your user control center
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                  {emailField}
                  {passwordField}
                  {captchaField}
                  {errorBox}
                  <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className={`w-full py-3.5 rounded-lg font-bold text-[15px] text-white transition-colors ${
                      loading
                        ? "bg-[#6B3FE0]/60 cursor-not-allowed"
                        : canSubmit
                          ? "bg-[#6B3FE0] hover:bg-[#5a31c9]"
                          : "bg-[#6B3FE0]/40 cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Authenticating..." : "Enter Dashboard"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={switchRole}
                    className="text-[15px] font-semibold text-[#6B3FE0] hover:underline"
                  >
                    Continue as Admin
                  </button>
                </div>

                <div className="mt-10 flex items-center justify-center text-[15px] text-gray-600">
                  <span className="font-medium">© 2026 Dcvpay</span>
                  <span className="mx-3 text-gray-400">·</span>
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 font-medium"
                  >
                    Terms
                  </a>
                  <span className="mx-2 text-gray-400">&amp;</span>
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 font-medium"
                  >
                    Privacy
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="admin-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-[460px] flex flex-col items-center"
              >
                <img
                  src={logo}
                  alt="DCvPay logo"
                  className="w-16 h-16 object-contain mb-6"
                />

                <h2 className="text-[32px] font-bold text-gray-900 text-center mb-2">
                  Welcome back
                </h2>
                <p className="text-gray-500 text-center mb-8 text-base">
                  Access your admin control center
                </p>

                <div className="w-full rounded-xl border border-blue-100 bg-blue-50/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-8">
                  <form onSubmit={handleLogin} className="space-y-5">
                    {emailField}
                    {passwordField}
                    {captchaField}
                    {errorBox}
                    <button
                      type="submit"
                      disabled={loading || !canSubmit}
                      className={`w-full py-3.5 rounded-lg font-semibold text-[15px] text-white transition-colors ${
                        loading
                          ? "bg-blue-300 cursor-not-allowed"
                          : canSubmit
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-blue-300 cursor-not-allowed"
                      }`}
                    >
                      {loading ? "Authenticating..." : "Enter Dashboard"}
                    </button>
                  </form>
                </div>

                <p className="mt-6 text-[15px] text-gray-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={switchRole}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Continue as User
                  </button>
                </p>

                <div className="mt-10 flex items-center justify-center text-[15px] text-gray-600">
                  <span className="font-medium">© 2026 Dcvpay</span>
                  <span className="mx-3 text-gray-400">·</span>
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 font-medium"
                  >
                    Terms
                  </a>
                  <span className="mx-2 text-gray-400">&amp;</span>
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 font-medium"
                  >
                    Privacy
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
