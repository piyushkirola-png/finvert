import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, User, LogOut, Key } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSections, panelTitle, type SidebarSection } from "./sidebarConfig";
import logo from "../../assets/logo.png";

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user, logout } = useAuth();

  const [isPremium, setIsPremium] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([
    "Overview",
    "Payments",
    "Management",
    "API Playground",
    "Bulk Uploads",
    "Reports",
    "System",
    "Api Reference",
    "Documentation",
    "Configuration",
    "Monitoring",
  ]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setIsPremium((JSON.parse(stored)?.planType ?? "BASIC") === "PREMIUM");
      } catch {
        setIsPremium(false);
      }
    }
  }, [user]);

  const sections = useMemo(
    () => getSections(role, isPremium),
    [role, isPremium],
  );
  const { title, subtitle } = panelTitle(role);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path: string) => {
    const current = location.pathname;
    if (current.startsWith(path)) return true;
    if (path === "/merchants" && current.startsWith("/merchant-summary"))
      return true;
    return false;
  };

  const sectionActive = (section: SidebarSection) =>
    section.items.some((item) => {
      const current = location.pathname;
      if (item.path && current.startsWith(item.path)) return true;
      if (item.children)
        return item.children.some((c) => current.startsWith(c.path));
      return false;
    });

  const toggleSection = (key: string) =>
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      <aside className="w-64 h-screen overflow-y-auto bg-slate-900 text-slate-100 flex flex-col">
        {/* Header with logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={logo} alt="DCvPay" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="text-sm font-semibold text-white">{title}</h1>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sections.map((section) => {
            const isOpen = openSections.includes(section.title);
            const active = sectionActive(section);
            const SectionIcon = section.icon;

            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
                    active
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon size={16} />
                    <span>{section.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-0.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;

                      if (item.children && item.children.length > 0) {
                        const childOpen = openSections.includes(item.label);
                        const hasActiveChild = item.children.some((c) =>
                          isActive(c.path),
                        );
                        return (
                          <div key={item.label}>
                            <button
                              onClick={() => toggleSection(item.label)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition ${
                                hasActiveChild
                                  ? "text-white bg-slate-800/60"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <ItemIcon size={14} />
                                {item.label}
                              </div>
                              {childOpen ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}
                            </button>
                            {childOpen && (
                              <div className="ml-3 pl-3 border-l border-slate-800 mt-0.5 space-y-0.5">
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon;
                                  return (
                                    <button
                                      key={child.path}
                                      onClick={() => navigate(child.path)}
                                      className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition ${
                                        isActive(child.path)
                                          ? "bg-slate-800 text-white font-medium"
                                          : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                                      }`}
                                    >
                                      {ChildIcon ? (
                                        <ChildIcon size={13} />
                                      ) : null}
                                      {child.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={item.path}
                          onClick={() => item.path && navigate(item.path)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition ${
                            item.path && isActive(item.path)
                              ? "bg-slate-800 text-white font-medium"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                          }`}
                        >
                          <ItemIcon size={14} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Account */}
        <div
          className="border-t border-slate-800 p-3 relative"
          ref={profileMenuRef}
        >
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                <User size={14} className="text-slate-300" />
              </div>
              <span className="truncate">{user?.fullName || "Account"}</span>
            </div>
            <ChevronRight
              size={14}
              className={`transition-transform ${isProfileMenuOpen ? "rotate-90" : ""}`}
            />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-slate-800 rounded-md border border-slate-700 overflow-hidden shadow-lg">
              <button
                onClick={() => {
                  navigate("/profile");
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition"
              >
                <User size={14} /> Profile
              </button>
              {role !== "ADMIN" && (
                <button
                  onClick={() => {
                    navigate("/update-password");
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition"
                >
                  <Key size={14} /> Update Password
                </button>
              )}
              <div className="border-t border-slate-700" />
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Logout confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] max-w-[90vw] p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Logout?
              </h3>
              <p className="text-sm text-slate-500">
                You'll need to log in again to access your dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-9 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className="flex-1 h-9 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {isLoggingOut ? "Logging out..." : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
