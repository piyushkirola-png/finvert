import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  useCreateMerchantRouting,
  useUpdateMerchantRouting,
} from "../../api/mutations/merchantRoutingMutations";
import {
  useGatewaysForRouting,
  useMerchantsForRouting,
} from "../../api/queries/useMerchantRouting";
import type {
  MerchantRouting,
  MerchantGatewayPriority,
} from "../../types/merchantRouting";
import { INPUT, LABEL } from "../../lib/styles";

interface MerchantRoutingFormProps {
  routing: MerchantRouting | null;
  onClose: () => void;
  onSuccess: () => void;
}

const strategies = [
  { value: "PRIORITY", label: "Priority (Ordered List)" },
  { value: "FAILOVER", label: "Failover (Primary → Secondary)" },
  { value: "HYBRID", label: "Hybrid (Mixed)" },
];

const paymentModes = [
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "CARD" },
  { value: "UPI_INTENT", label: "UPI Intent" },
  { value: "UPI_QR", label: "UPI QR" },
  { value: "UPI_COLLECT", label: "UPI Collect" },
];

export default function MerchantRoutingForm({
  routing,
  onClose,
  onSuccess,
}: MerchantRoutingFormProps) {
  const isEdit = !!routing;
  const { data: gateways = [], isLoading: gatewaysLoading } =
    useGatewaysForRouting();
  const { data: merchants = [], isLoading: merchantsLoading } =
    useMerchantsForRouting();
  const { mutate: createRouting, isPending: isCreating } =
    useCreateMerchantRouting();
  const { mutate: updateRouting, isPending: isUpdating } =
    useUpdateMerchantRouting();

  const [form, setForm] = useState({
    merchantId: 0,
    routingStrategy: "PRIORITY",
    isActive: true,
  });

  const [priorities, setPriorities] = useState<MerchantGatewayPriority[]>([]);

  useEffect(() => {
    if (routing) {
      setForm({
        merchantId: routing.merchantId,
        routingStrategy: routing.routingStrategy,
        isActive: routing.isActive,
      });
      if (routing.priorities) {
        setPriorities(routing.priorities);
      }
    }
  }, [routing]);

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addPriority = () => {
    const usedGatewayIds = priorities.map((p) => p.gatewayId);
    const availableGateway = gateways.find(
      (g) => !usedGatewayIds.includes(g.id),
    );

    if (!availableGateway) {
      toast.error("All gateways are already added to the priority list");
      return;
    }

    const newPriority: MerchantGatewayPriority = {
      gatewayId: availableGateway.id,
      priority: priorities.length + 1,
      paymentModes: [],
      enableFailover: true,
      maxRetries: 3,
      isActive: true,
    };
    setPriorities([...priorities, newPriority]);
  };

  const updatePriority = (index: number, key: string, value: any) => {
    const updated = [...priorities];
    updated[index] = { ...updated[index], [key]: value };
    setPriorities(updated);
  };

  const removePriority = (index: number) => {
    const updated = priorities.filter((_, i) => i !== index);
    updated.forEach((p, i) => (p.priority = i + 1));
    setPriorities(updated);
  };

  const movePriority = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === priorities.length - 1)
    )
      return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...priorities];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((p, i) => (p.priority = i + 1));
    setPriorities(updated);
  };

  const handleSubmit = () => {
    if (!form.merchantId) {
      toast.error("Please select a merchant");
      return;
    }
    if (priorities.length === 0) {
      toast.error("Please add at least one gateway priority");
      return;
    }
    const gatewayIds = priorities.map((p) => p.gatewayId);
    const uniqueGatewayIds = [...new Set(gatewayIds)];
    if (gatewayIds.length !== uniqueGatewayIds.length) {
      toast.error(
        "Duplicate gateway detected. Each gateway can only appear once.",
      );
      return;
    }
    for (const p of priorities) {
      if (!p.gatewayId) {
        toast.error("Please select a gateway for all priorities");
        return;
      }
    }

    const payload = {
      merchantId: form.merchantId,
      routingStrategy: form.routingStrategy,
      isActive: form.isActive,
      priorities: priorities.map((p) => ({
        gatewayId: p.gatewayId,
        priority: p.priority,
        paymentModes: p.paymentModes,
        enableFailover: p.enableFailover,
        maxRetries: p.maxRetries,
        isActive: p.isActive,
      })),
    };

    if (isEdit && routing) {
      updateRouting(
        { id: routing.id, data: payload as any },
        {
          onSuccess: () => {
            toast.success("Routing updated");
            onSuccess();
          },
        },
      );
    } else {
      createRouting(payload as any, {
        onSuccess: () => {
          toast.success("Routing created");
          onSuccess();
        },
      });
    }
  };

  const isLoading =
    isCreating || isUpdating || gatewaysLoading || merchantsLoading;

  return (
    <div className="space-y-4">
      {/* Section 1: Merchant | Strategy */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={LABEL}>Merchant</label>
          <select
            value={form.merchantId}
            onChange={(e) => handleChange("merchantId", Number(e.target.value))}
            disabled={isEdit}
            className={`${INPUT} disabled:opacity-60`}
          >
            <option value={0}>Select a merchant</option>
            {(merchants || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || `Merchant ${m.id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Routing Strategy</label>
          <select
            value={form.routingStrategy}
            onChange={(e) => handleChange("routingStrategy", e.target.value)}
            className={INPUT}
          >
            {strategies.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 2: Gateway Priority Order */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <label className={LABEL}>Gateway Priority Order</label>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordered from highest to lowest priority
            </p>
          </div>
          <button
            type="button"
            onClick={addPriority}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-900 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition"
          >
            <Plus size={14} /> Add Gateway
          </button>
        </div>

        {priorities.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-md border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No gateways configured</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Gateway" to start building your priority list
            </p>
          </div>
        ) : (
          <div
            className="space-y-2 overflow-y-auto pr-1"
            style={{ maxHeight: 360 }}
          >
            {priorities.map((p, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200"
              >
                {/* Priority Number */}
                <div className="flex items-center gap-1.5 min-w-[50px]">
                  <GripVertical size={16} className="text-slate-400" />
                  <span
                    className={`text-sm font-bold ${
                      index === 0 ? "text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {p.priority}
                  </span>
                </div>

                {/* Gateway + Payment Modes */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <select
                    value={p.gatewayId}
                    onChange={(e) =>
                      updatePriority(index, "gatewayId", Number(e.target.value))
                    }
                    className={`${INPUT} text-sm`}
                  >
                    <option value={0}>Select Gateway</option>
                    {(gateways || [])
                      .filter((g) => {
                        const isUsed = priorities.some(
                          (p2, i) => i !== index && p2.gatewayId === g.id,
                        );
                        return !isUsed;
                      })
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.gateway_name}
                        </option>
                      ))}
                  </select>

                  <div className="flex flex-wrap gap-1">
                    {paymentModes.map((mode) => {
                      const isSelected =
                        p.paymentModes?.includes(mode.value) || false;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => {
                            let updatedModes;
                            if (isSelected) {
                              updatedModes = p.paymentModes.filter(
                                (m) => m !== mode.value,
                              );
                            } else {
                              updatedModes = [
                                ...(p.paymentModes || []),
                                mode.value,
                              ];
                            }
                            updatePriority(index, "paymentModes", updatedModes);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
                            isSelected
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Failover + Retries + Active */}
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.enableFailover}
                      onChange={(e) =>
                        updatePriority(
                          index,
                          "enableFailover",
                          e.target.checked,
                        )
                      }
                      className="w-3.5 h-3.5 rounded accent-slate-900"
                    />
                    <span className="text-slate-600">Failover</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={p.maxRetries}
                      onChange={(e) =>
                        updatePriority(
                          index,
                          "maxRetries",
                          Number(e.target.value),
                        )
                      }
                      className="w-12 px-1.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-center outline-none"
                      min="0"
                      max="10"
                    />
                    <span className="text-xs text-slate-500">retries</span>
                  </div>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.isActive !== undefined ? p.isActive : true}
                      onChange={(e) =>
                        updatePriority(index, "isActive", e.target.checked)
                      }
                      className="w-3.5 h-3.5 rounded accent-slate-900"
                    />
                    <span
                      className={
                        p.isActive !== undefined && !p.isActive
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {p.isActive !== undefined && !p.isActive
                        ? "Inactive"
                        : "Active"}
                    </span>
                  </label>
                </div>

                {/* Move + Delete */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => movePriority(index, "up")}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => movePriority(index, "down")}
                    disabled={index === priorities.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removePriority(index)}
                    className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition ml-0.5"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
        </label>
        <span className="text-sm font-medium text-slate-700">
          {form.isActive
            ? "Active — Routing is enabled"
            : "Inactive — Routing is disabled"}
        </span>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {isLoading
            ? "Saving..."
            : isEdit
              ? "Update Configuration"
              : "Create Configuration"}
        </button>
      </div>
    </div>
  );
}
