import api from "../../lib/api-client";
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
} from "../../types/user";

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get("/users");
  return data.users;
};

export const getUserById = async (id: number): Promise<User> => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};

export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const { data } = await api.post("/users", payload);
  return data;
};

export const updateUser = async (
  id: number,
  payload: UpdateUserPayload,
): Promise<User> => {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/users/${id}`);
};
