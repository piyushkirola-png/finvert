import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  login as loginService,
  logout as logoutService,
} from "../../api/services/authService";
import type { AuthUser, LoginPayload, Role } from "../../types/auth";

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const USER_KEY = "user";
const LAST_ACTIVITY_KEY = "lastActivityAt";

/** 30 minutes of inactivity triggers logout */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActivityAt: number;
  touchSession: () => void;
  login: (payload: LoginPayload, role: Role) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** hydrate lastActivityAt from localStorage, or default to now */
function readStoredLastActivity(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return Date.now();
    const num = Number(raw);
    return Number.isFinite(num) ? num : Date.now();
  } catch {
    return Date.now();
  }
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  const [lastActivityAt, setLastActivityAt] = useState<number>(
    readStoredLastActivity,
  );

  const didInitialExpiryCheck = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || isExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      setUserState(null);
      return;
    }

    if (!didInitialExpiryCheck.current) {
      didInitialExpiryCheck.current = true;
      const stored = readStoredLastActivity();
      if (Date.now() - stored > SESSION_TIMEOUT_MS) {
        void logoutService().catch(() => { });
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setUserState(null);
      }
    }
  }, []);

  const setUser = useCallback((next: AuthUser) => {
    setUserState(next);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    const now = Date.now();
    setLastActivityAt(now);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  }, []);

  const touchSession = useCallback(() => {
    const now = Date.now();
    setLastActivityAt(now);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  }, []);

  const login = useCallback(
    async (payload: LoginPayload, role: Role) => {
      setIsLoading(true);
      try {
        const {
          accessToken,
          refreshToken,
          user: apiUser,
        } = await loginService(payload, role);
        localStorage.setItem(TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        const merged: AuthUser = { ...apiUser, role };
        setUser(merged);
        return merged;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    await logoutService().catch(() => { });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUserState(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    let last = 0;
    const handler = (e: Event) => {
      if (
        e instanceof KeyboardEvent &&
        (e.key === "F5" ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r"))
      ) {
        return;
      }
      const now = Date.now();
      if (now - last > 2000) {
        last = now;
        touchSession();
      }
    };

    events.forEach((e) =>
      window.addEventListener(e, handler, { passive: true }),
    );

    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const n = Number(e.newValue);
        if (Number.isFinite(n)) setLastActivityAt(n);
      }
      if (e.key === USER_KEY && !e.newValue) {
        setUserState(null);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      window.removeEventListener("storage", onStorage);
    };
  }, [user, touchSession]);

  // Auto-logout when idle timeout reached
  useEffect(() => {
    if (!user) return;

    const remaining = SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt);
    if (remaining <= 0) {
      void logout();
      return;
    }

    const timer = setTimeout(() => {
      void logout();
    }, remaining);

    return () => clearTimeout(timer);
  }, [user, lastActivityAt, logout]);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const stored = readStoredLastActivity();
      if (Date.now() - stored > SESSION_TIMEOUT_MS) {
        void logout();
      } else {
        setLastActivityAt(stored);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user && !!localStorage.getItem(TOKEN_KEY),
      isLoading,
      lastActivityAt,
      touchSession,
      login,
      logout,
      setUser,
    }),
    [user, isLoading, lastActivityAt, touchSession, login, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}