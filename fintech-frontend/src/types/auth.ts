export type Role = "ADMIN" | "USER";

export interface AuthUser {
  id: number | string;
  email: string;
  fullName?: string;
  name?: string;
  role: Role;
  defaultCurrency?: string;
  phoneNumber?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
  merchantId?: number | null;
  merchant?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
