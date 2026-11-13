export interface User {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt?: string;
  role?: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  isActive: boolean;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  isActive?: boolean;
}
