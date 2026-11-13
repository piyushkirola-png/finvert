import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import api from "../../lib/api-client";
import type { Merchant } from "../../types/merchant";
import { useNavigate } from "react-router-dom";
import { Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import Pagination from "../../components/ui/Pagination";
import {
  useApproveMerchant,
  useRejectMerchant,
  useAssignUserToMerchant,
  useUpdateMerchantPlan,
} from "../../api/mutations/merchantMutations";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

interface User {
  id: number;
  fullName: string;
  email: string;
  merchantId: number | null;
}

interface MerchantManagementProps {
  merchants: Merchant[];
  page: number;
  setPage: (p: number) => void;
  limit: number;
  setLimit: (l: number) => void;
  total: number;
  onEditMerchant: (merchant: Merchant) => void;
  onDeleteMerchant: (merchant: Merchant) => void;
  onRefresh?: () => void;
}

const ACTION_BTN =
  "px-3 py-1.5 text-xs font-medium rounded-md transition disabled:opacity-50 whitespace-nowrap min-w-[70px] text-center";

export default function MerchantManagement({
  merchants,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onEditMerchant,
  onDeleteMerchant,
  onRefresh,
}: MerchantManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState<Merchant | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // Plan Change Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanMerchant, setSelectedPlanMerchant] =
    useState<Merchant | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("BASIC");

  const { mutate: approveMerchant, isPending: isApproving } =
    useApproveMerchant();
  const { mutate: rejectMerchant, isPending: isRejecting } =
    useRejectMerchant();
  const { mutate: assignUser, isPending: isAssigning } =
    useAssignUserToMerchant();
  const { mutate: updatePlan, isPending: isUpdatingPlan } =
    useUpdateMerchantPlan();

  // fetch users
  useEffect(() => {
    api.get("/users").then((res) => {
      const allUsers = res.data.users || [];
      const onlyMerchants = allUsers.filter(
        (u: any) => u.role !== "ADMIN" && u.role !== "SUPER_ADMIN",
      );
      setUsers(onlyMerchants);
    });
  }, []);

  // ASSIGN USER MODAL OPEN
  const openAssignModal = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setSelectedUserId(null);
    setOpen(true);
  };

  // ASSIGN USER
  const handleAssignUser = async () => {
    if (!selectedMerchant || !selectedUserId) return;

    assignUser(
      {
        merchantId: selectedMerchant.id,
        userId: selectedUserId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedMerchant(null);
          setSelectedUserId(null);
          api.get("/api/users").then((res) => {
            const allUsers = res.data.users || [];
            const onlyMerchants = allUsers.filter(
              (u: any) => u.role !== "ADMIN" && u.role !== "SUPER_ADMIN",
            );
            setUsers(onlyMerchants);
          });
          if (onRefresh) onRefresh();
        },
      },
    );
  };

  // APPROVE MERCHANT
  const handleApprove = (merchant: Merchant) => {
    approveMerchant(merchant.id, {
      onSuccess: () => {
        if (onRefresh) onRefresh();
      },
    });
  };

  // REJECT MERCHANT
  const handleReject = (merchant: Merchant) => {
    rejectMerchant(merchant.id, {
      onSuccess: () => {
        if (onRefresh) onRefresh();
      },
    });
  };

  // OPEN PLAN MODAL
  const openPlanModal = (merchant: Merchant) => {
    setSelectedPlanMerchant(merchant);
    setSelectedPlan(merchant.planType || "BASIC");
    setShowPlanModal(true);
  };

  // UPDATE PLAN
  const handleUpdatePlan = () => {
    if (!selectedPlanMerchant) return;

    updatePlan(
      {
        merchantId: selectedPlanMerchant.id,
        planType: selectedPlan,
      },
      {
        onSuccess: () => {
          setShowPlanModal(false);
          setSelectedPlanMerchant(null);
          if (onRefresh) onRefresh();
        },
      },
    );
  };

  // Handle delete click
  const handleDeleteClick = (merchant: Merchant) => {
    setMerchantToDelete(merchant);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!merchantToDelete) return;

    setDeleting(true);
    try {
      await onDeleteMerchant(merchantToDelete);
      toast.success(
        `Merchant "${merchantToDelete.merchantName}" deleted successfully`,
      );
      setShowDeleteModal(false);
      setMerchantToDelete(null);
    } catch (error) {
      console.error("Failed to delete merchant", error);
      toast.error("Failed to delete merchant");
    } finally {
      setDeleting(false);
    }
  };

  const colCount = 8;

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                <th className={TH}>Merchant</th>
                <th className={TH}>Email</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Status</th>
                <th className={TH}>Plan</th>
                <th className={TH}>Action</th>
                <th className={TH}>Details</th>
              </tr>
            </thead>
            <tbody>
              {merchants.length === 0 && (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    No merchants found
                  </td>
                </tr>
              )}
              {merchants.map((merchant) => (
                <tr
                  key={merchant.id}
                  className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                >
                  <td className={TD_MONO}>{merchant.id}</td>
                  <td className={`${TD} font-semibold text-slate-800`}>
                    {merchant.merchantName}
                  </td>
                  <td className={TD}>{merchant.email}</td>
                  <td className={TD_MONO}>{merchant.phone}</td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${
                        BADGE_COLORS[
                          merchant.status === "ACTIVE"
                            ? "green"
                            : merchant.status === "PENDING"
                              ? "yellow"
                              : "red"
                        ]
                      }`}
                    >
                      {merchant.status || "PENDING"}
                    </span>
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${BADGE_COLORS[merchant.planType === "PREMIUM" ? "orange" : "slate"]}`}
                    >
                      {merchant.planType || "BASIC"}
                    </span>
                  </td>
                  <td className={`${TD} min-w-[360px]`}>
                    <div className="flex gap-2 items-center flex-nowrap whitespace-nowrap">
                      {merchant.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(merchant)}
                            disabled={isApproving}
                            className={`${ACTION_BTN} bg-green-100 text-green-700 hover:bg-green-200`}
                          >
                            {isApproving ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(merchant)}
                            disabled={isRejecting}
                            className={`${ACTION_BTN} bg-red-100 text-red-700 hover:bg-red-200`}
                          >
                            {isRejecting ? "..." : "Reject"}
                          </button>
                        </>
                      )}

                      {merchant.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => onEditMerchant(merchant)}
                            className={`${ACTION_BTN} bg-green-100 text-green-700 hover:bg-green-200`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(merchant)}
                            className={`${ACTION_BTN} bg-red-100 text-red-700 hover:bg-red-200`}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => openAssignModal(merchant)}
                            className={`${ACTION_BTN} bg-purple-100 text-purple-700 hover:bg-purple-200`}
                          >
                            Assign User
                          </button>
                          <button
                            onClick={() => openPlanModal(merchant)}
                            className={`${ACTION_BTN} bg-orange-100 text-orange-700 hover:bg-orange-200`}
                          >
                            Change Plan
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/webhook-format/${merchant.id}`)
                            }
                            className={`${ACTION_BTN} bg-cyan-100 text-cyan-700 hover:bg-cyan-200`}
                          >
                            Webhook Format
                          </button>
                        </>
                      )}

                      {merchant.status === "INACTIVE" && (
                        <>
                          <button
                            onClick={() => onEditMerchant(merchant)}
                            className={`${ACTION_BTN} bg-green-100 text-green-700 hover:bg-green-200`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(merchant)}
                            className={`${ACTION_BTN} bg-red-100 text-red-700 hover:bg-red-200`}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => openAssignModal(merchant)}
                            className={`${ACTION_BTN} bg-purple-100 text-purple-700 hover:bg-purple-200`}
                          >
                            Assign
                          </button>
                        </>
                      )}

                      {merchant.status === "REJECTED" && (
                        <span
                          className={`${ACTION_BTN} bg-red-100 text-red-700`}
                        >
                          Unavailable
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={TD}>
                    <button
                      onClick={() =>
                        navigate(`/merchant-summary/${merchant.id}`)
                      }
                      className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium hover:bg-indigo-200 transition whitespace-nowrap min-w-[100px] text-center"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
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

      {/* ================= ASSIGN USER MODAL ================= */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_BODY}>
              <h2 className="text-sm font-semibold mb-3">
                Assign User to {selectedMerchant?.merchantName}
              </h2>
              <select
                className="w-full px-3 py-2 rounded-md bg-slate-100 border border-slate-200 outline-none text-sm"
                value={selectedUserId ?? ""}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option
                    key={u.id}
                    value={u.id}
                    disabled={u.merchantId !== null}
                  >
                    {u.fullName} {u.merchantId ? "(Already Assigned)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => setOpen(false)}
                className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserId || isAssigning}
                onClick={handleAssignUser}
                className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
              >
                {isAssigning ? "Assigning..." : "Assign User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CHANGE PLAN MODAL ================= */}
      <AnimatePresence>
        {showPlanModal && selectedPlanMerchant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`${MODAL_SHELL} max-w-sm`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={MODAL_BODY}>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Change Plan
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Update plan for{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedPlanMerchant.merchantName}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Current: {selectedPlanMerchant.planType || "BASIC"}
                  </p>
                </div>

                <div className="mb-3">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">
                    Select Plan
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-slate-100 border border-slate-200 outline-none text-sm"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                  {selectedPlan === "PREMIUM" && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                      Premium features: Bulk Upload, Scheduled Payments
                    </div>
                  )}
                </div>
              </div>
              <div className={MODAL_FOOTER}>
                <button
                  onClick={() => {
                    setShowPlanModal(false);
                    setSelectedPlanMerchant(null);
                  }}
                  className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePlan}
                  disabled={isUpdatingPlan}
                  className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isUpdatingPlan ? "Updating..." : "Update Plan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= DELETE MERCHANT CONFIRM MODAL ================= */}
      {showDeleteModal && merchantToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${MODAL_SHELL} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete Merchant?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    {merchantToDelete.merchantName}
                  </span>
                  ?
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  This action cannot be undone. All merchant data will be
                  permanently removed.
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMerchantToDelete(null);
                }}
                className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
