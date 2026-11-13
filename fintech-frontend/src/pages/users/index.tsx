import { useState, useMemo } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUsers } from "../../api/queries/useUsers";
import {
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "../../api/mutations/userMutations";
import type { User } from "../../types/user";
import UsersTable from "./UsersTable";
import UsersForm from "./UsersForm";
import UsersStats from "./UsersStats";
import {
  PAGE_HEADER,
  BTN_REFRESH,
  BTN_PRIMARY,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  isActive: true,
};

export default function UsersList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: users = [], refetch, isLoading: loading } = useUsers();
  const { mutate: createUser } = useCreateUser();
  const { mutate: updateUser } = useUpdateUser();
  const { mutate: deleteUserMutation, isPending: isDeleting } = useDeleteUser();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.id - b.id),
    [users],
  );

  const total = sortedUsers.length;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedUsers.slice(start, start + limit);
  }, [sortedUsers, page, limit]);

  const openCreate = () => {
    setEditUser(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      password: "",
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phoneNumber) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!editUser && !formData.password) {
      toast.error("Password is required for new user");
      return;
    }

    const payload = { ...formData };

    if (editUser) {
      updateUser(
        { id: editUser.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`User "${formData.fullName}" updated successfully`);
            setIsModalOpen(false);
            setEditUser(null);
            refetch();
          },
          onError: (error: any) => {
            toast.error(
              error.response?.data?.message || "Failed to update user",
            );
          },
        },
      );
    } else {
      createUser(payload, {
        onSuccess: () => {
          toast.success(`User "${formData.fullName}" created successfully`);
          setIsModalOpen(false);
          setFormData(EMPTY_FORM);
          refetch();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || "Failed to create user");
        },
      });
    }
  };

  const confirmDeleteUser = () => {
    if (!deleteUserTarget) return;
    setDeleting(true);

    deleteUserMutation(deleteUserTarget.id, {
      onSuccess: () => {
        toast.success(
          `User "${deleteUserTarget.fullName}" deleted successfully`,
        );
        setDeleteUserTarget(null);
        setDeleting(false);
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to delete user");
        setDeleting(false);
      },
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshed");
  };

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage system users</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openCreate} className={BTN_PRIMARY}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <UsersStats users={users} />

      <UsersTable
        users={paginatedUsers}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={(l) => {
          setLimit(l);
          setPage(1);
        }}
        total={total}
        onEdit={openEdit}
        onDelete={setDeleteUserTarget}
      />

      {/* Add/Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-md max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h2 className="text-sm font-semibold text-slate-900">
                {editUser ? "Edit User" : "Add New User"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editUser
                  ? "Update user information"
                  : "Create a new system user"}
              </p>
            </div>
            <div className={MODAL_BODY}>
              <UsersForm
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                editUser={editUser}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteUserTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-50">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete User?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteUserTarget.fullName}
                  </span>
                  ?
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => setDeleteUserTarget(null)}
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deleting || isDeleting}
                className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting || isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
