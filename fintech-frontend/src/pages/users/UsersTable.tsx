import { Pencil, Trash2 } from "lucide-react";
import type { User } from "../../types/user";
import Pagination from "../../components/ui/Pagination";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  users: User[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const ACTION_BTN =
  "p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600";

const roleColors: Record<string, keyof typeof BADGE_COLORS> = {
  ADMIN: "purple",
  USER: "blue",
  MERCHANT: "orange",
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function UsersTable({
  users,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onEdit,
  onDelete,
}: Props) {
  const colCount = 8;

  return (
    <div className={TABLE_SHELL}>
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
        <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[1000px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH}>ID</th>
              <th className={TH}>Name</th>
              <th className={TH}>Phone</th>
              <th className={TH}>Email</th>
              <th className={TH}>Status</th>
              <th className={TH}>Role</th>
              <th className={TH}>Created At</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="text-center py-10 text-sm text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="text-center py-10 text-sm text-slate-500"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                >
                  <td className={TD_MONO}>{user.id}</td>
                  <td className={`${TD} font-semibold text-slate-800`}>
                    {user.fullName}
                  </td>
                  <td className={TD_MONO}>{user.phoneNumber || "-"}</td>
                  <td className={TD}>{user.email}</td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${BADGE_COLORS[user.isActive ? "green" : "yellow"]}`}
                    >
                      {user.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className={TD}>
                    {user.role ? (
                      <span
                        className={`${BADGE} ${BADGE_COLORS[roleColors[user.role] || "slate"]}`}
                      >
                        {user.role}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={TD}>{formatDate(user.createdAt)}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEdit(user)}
                        className={ACTION_BTN}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(user)}
                        className={`${ACTION_BTN} hover:text-red-600`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
