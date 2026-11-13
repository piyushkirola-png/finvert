import { useEffect } from "react";
import type { User } from "../../types/user";
import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  editUser: User | null;
  formData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    isActive: boolean;
  };
  setFormData: (value: any) => void;
  onSubmit: (e: any) => void;
}

export default function UsersForm({
  isModalOpen,
  setIsModalOpen,
  editUser,
  formData,
  setFormData,
  onSubmit,
}: Props) {
  // Reset on open when creating a new user
  useEffect(() => {
    if (isModalOpen && !editUser) {
      // parent already resets — nothing to do here
    }
  }, [isModalOpen, editUser]);

  if (!isModalOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className={LABEL}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            className={INPUT}
            placeholder="Enter full name"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            required
          />
        </div>

        {/* Email | Phone (50:50) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={LABEL}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={INPUT}
              placeholder="Enter email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              className={INPUT}
              placeholder="Enter phone number"
              value={formData.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password (create only) */}
        {!editUser && (
          <div className="space-y-1">
            <label className={LABEL}>
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className={INPUT}
              placeholder="Enter password (min 6 characters)"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
          </div>
        )}

        {/* Status */}
        <div className="space-y-1">
          <label className={LABEL}>Status</label>
          <select
            className={INPUT}
            value={formData.isActive ? "active" : "inactive"}
            onChange={(e) =>
              handleChange("isActive", e.target.value === "active")
            }
          >
            <option value="active">ACTIVE</option>
            <option value="inactive">INACTIVE</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            {editUser ? "Update User" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
