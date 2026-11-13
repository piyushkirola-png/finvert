import axios from "axios";
import api from "../../lib/api-client";
import type {
  AuthUser,
  LoginPayload,
  LoginResponse,
  Role,
} from "../../types/auth";

const BASE = import.meta.env.VITE_API_URL;

const endpointFor = (role: Role) =>
  role === "ADMIN" ? `${BASE}/auth/admin/login` : `${BASE}/auth/user/login`;

export async function login(
  payload: LoginPayload,
  role: Role,
): Promise<LoginResponse> {
  const { data } = await axios.post(endpointFor(role), payload);
  const accessToken = data?.data?.accessToken ?? data?.token;
  const refreshToken = data?.data?.refreshToken;
  const user: AuthUser = data?.data?.user ?? data?.user;

  if (!accessToken || !user) {
    throw new Error("Invalid login response from server");
  }

  if (!user.defaultCurrency) {
    try {
      const jwtPayload = JSON.parse(atob(accessToken.split(".")[1]));
      user.defaultCurrency = jwtPayload.defaultCurrency ?? "USD";
    } catch {
      user.defaultCurrency = "USD";
    }
  }

  return { accessToken, refreshToken, user: { ...user, role } };
}

export async function fetchProfile(): Promise<AuthUser> {
  const { data } = await api.get("/auth/profile");
  return data?.data ?? data;
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
) {
  const { data } = await api.put("/auth/update-password", {
    currentPassword,
    newPassword,
  });
  return data;
}

export async function updateCurrency(defaultCurrency: string) {
  const { data } = await api.put("/users/currency", { defaultCurrency });
  return data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore — clear client-side anyway
  }
}
