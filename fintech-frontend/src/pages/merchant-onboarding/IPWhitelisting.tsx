import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import {
  useAddIPToWhitelist,
  useUpdateIPInWhitelist,
  useDeleteIPFromWhitelist,
} from "../../api/mutations/merchantOnboardingMutations";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { TABLE_SHELL, TH, TD_MONO, INPUT, BTN_PRIMARY } from "../../lib/styles";

interface Props {
  whitelistedIPs: string[];
  setWhitelistedIPs: React.Dispatch<React.SetStateAction<string[]>>;
  merchantId?: string;
  refetchIPs: () => void;
}

const ICON_BTN = "p-1.5 rounded-md hover:bg-slate-100 transition";

export default function IPWhitelisting({
  whitelistedIPs,
  setWhitelistedIPs,
  merchantId,
  refetchIPs,
}: Props) {
  const [ipInput, setIpInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteIp, setDeleteIp] = useState<string | null>(null);

  const { mutate: addIP, isPending: isAdding } = useAddIPToWhitelist();
  const { mutate: updateIP, isPending: isUpdating } = useUpdateIPInWhitelist();
  const { mutate: removeIP, isPending: isDeleting } =
    useDeleteIPFromWhitelist();

  const handleAdd = () => {
    const ip = ipInput.trim();
    if (!ip) return;
    addIP(
      { merchantId: merchantId || "", ip },
      {
        onSuccess: () => {
          setWhitelistedIPs([...whitelistedIPs, ip]);
          setIpInput("");
          refetchIPs();
        },
      },
    );
  };

  const handleSaveEdit = (index: number) => {
    const next = editValue.trim();
    if (!next) return;
    updateIP(
      {
        merchantId: merchantId || "",
        oldIp: whitelistedIPs[index],
        newIp: next,
      },
      {
        onSuccess: () => {
          const copy = [...whitelistedIPs];
          copy[index] = next;
          setWhitelistedIPs(copy);
          setEditingIndex(null);
          setEditValue("");
          refetchIPs();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteIp) return;
    removeIP(
      { merchantId: merchantId || "", ip: deleteIp },
      {
        onSuccess: () => {
          setWhitelistedIPs(whitelistedIPs.filter((x) => x !== deleteIp));
          setDeleteIp(null);
          refetchIPs();
        },
      },
    );
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg min-h-[560px] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            IP Whitelisting
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Only whitelisted IPs can make API calls for this merchant.
          </p>
        </div>

        <div className="p-8 pb-4 flex gap-2">
          <input
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enter IP address (e.g. 192.168.1.1)"
            className={`${INPUT} h-11 text-base`}
          />
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className={`${BTN_PRIMARY} h-11 px-6 shrink-0 disabled:opacity-50`}
          >
            {isAdding ? "Adding..." : "Add IP"}
          </button>
        </div>

        <div
          className={TABLE_SHELL + " !border-0 !border-t !rounded-none flex-1"}
        >
          <table className="w-full">
            <thead>
              <tr>
                <th className={TH}>IP Address</th>
                <th className={`${TH} w-32`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {whitelistedIPs.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    No IP addresses whitelisted
                  </td>
                </tr>
              ) : (
                whitelistedIPs.map((ip, index) => (
                  <tr
                    key={ip + index}
                    className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                  >
                    <td className={TD_MONO}>
                      {editingIndex === index ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={`${INPUT} h-9 text-sm`}
                          autoFocus
                        />
                      ) : (
                        ip
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {editingIndex === index ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(index)}
                              disabled={isUpdating}
                              className={`${ICON_BTN} text-green-600`}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingIndex(null);
                                setEditValue("");
                              }}
                              className={`${ICON_BTN} text-slate-500`}
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingIndex(index);
                                setEditValue(ip);
                              }}
                              className={`${ICON_BTN} text-slate-600`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteIp(ip)}
                              className={`${ICON_BTN} text-red-600`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteIp}
        danger
        title="Delete IP Address?"
        message="This action cannot be undone."
        confirmLabel="Yes, Delete"
        loading={isDeleting}
        onCancel={() => setDeleteIp(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
