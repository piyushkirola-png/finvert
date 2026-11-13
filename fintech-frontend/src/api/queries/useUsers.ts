import { useQuery } from "@tanstack/react-query";
import { getUsers, getUserById } from "../services/userService";
import type { User } from "../../types/user";

export const useUsers = () =>
  useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

export const useUser = (id: number) =>
  useQuery<User>({
    queryKey: ["users", id],
    queryFn: () => getUserById(id),
    enabled: !!id,
  });
