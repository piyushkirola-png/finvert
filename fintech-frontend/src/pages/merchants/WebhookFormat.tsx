import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Eye,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api-client";
import { INPUT, PAGE_HEADER, BTN_PRIMARY } from "../../lib/styles";

const inputCls = `${INPUT} h-11 text-sm`;

interface Options {
  sources: string[];
  statuses: string[];
}

type FieldRow = {
  id: number;
  outKey: string;
  from: string;
  type: "" | "string" | "number";
  map: Record<string, string>;
  hasDefault: boolean;
  defaultValue: string;
  omitIfNull: boolean;
};

let counter = 0;
const newRow = (p: Partial<FieldRow> = {}): FieldRow => ({
  id: ++counter,
  outKey: "",
  from: "merchantReference",
  type: "",
  map: {},
  hasDefault: false,
  defaultValue: "",
  omitIfNull: false,
  ...p,
});

export default function WebhookFormat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const merchantId = id ? parseInt(id) : 0;
  const merchantName = `Merchant #${merchantId}`;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<Options>({
    sources: [],
    statuses: [],
  });
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [hadCustom, setHadCustom] = useState(false);
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [onlyStatuses, setOnlyStatuses] = useState<string[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  const errMsg = (e: any) =>
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Something went wrong";

  const loadConfigIntoState = (cfg: any) => {
    const order: string[] = cfg.order || [];
    const sortedEntries = Object.entries(cfg.fields || {}).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    const loadedRows: FieldRow[] = sortedEntries.map(
      ([outKey, rule]: [string, any]) =>
        newRow({
          outKey,
          from: rule.from,
          type: rule.type || "",
          map: Object.fromEntries(
            Object.entries(rule.map || {}).map(([k, v]) => [k, String(v)]),
          ),
          hasDefault: rule.default !== undefined && rule.default !== null,
          defaultValue:
            rule.default !== undefined && rule.default !== null
              ? String(rule.default)
              : "",
          omitIfNull: !!rule.omitIfNull,
        }),
    );
    setRows(loadedRows);
    setOnlyStatuses(cfg.onlyStatuses || []);
  };

  const buildConfig = () => {
    const fields: Record<string, any> = {};
    for (const r of rows) {
      const key = r.outKey.trim();
      if (!key) continue;
      if (fields[key]) throw new Error(`Duplicate output key "${key}"`);

      const rule: any = { from: r.from };
      if (r.type) rule.type = r.type;

      const map = Object.fromEntries(
        Object.entries(r.map).filter(([, v]) => v.trim() !== ""),
      );
      if (Object.keys(map).length) rule.map = map;

      if (r.hasDefault) rule.default = r.defaultValue;
      if (r.omitIfNull) rule.omitIfNull = true;
      fields[key] = rule;
    }

    if (Object.keys(fields).length === 0)
      throw new Error("Add at least one field");

    const config: any = { version: 1, fields };
    config.order = rows.map((r) => r.outKey.trim()).filter(Boolean);
    if (onlyStatuses.length) config.onlyStatuses = onlyStatuses;
    return config;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPreview(null);
      setPreviewErrors([]);
      try {
        const [optRes, cfgRes] = await Promise.all([
          api.get("/merchants/webhook-config/options"),
          api.get(`/merchants/${merchantId}/webhook-config`),
        ]);
        if (cancelled) return;
        setOptions(optRes.data.data);
        const cfg = cfgRes.data.data.webhookConfig;
        if (cfg) {
          loadConfigIntoState(cfg);
          setMode("custom");
          setHadCustom(true);
        } else {
          setRows([]);
          setOnlyStatuses([]);
          setMode("default");
          setHadCustom(false);
        }
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  const updateRow = (id: number, patch: Partial<FieldRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setPreview(null);
  };

  const switchToCustom = () => {
    setMode("custom");
    if (rows.length === 0) setRows([newRow()]);
  };

  const loadTemplate = () => {
    setRows([
      newRow({ outKey: "order_id", from: "merchantReference", type: "string" }),
      newRow({
        outKey: "utr",
        from: "utr",
        hasDefault: true,
        defaultValue: "",
      }),
      newRow({ outKey: "amount", from: "amount", type: "number" }),
      newRow({
        outKey: "status",
        from: "status",
        map: { COMPLETED: "SUCCESS", FAILED: "FAILED", PENDING: "PENDING" },
      }),
    ]);
    setOnlyStatuses([]);
    setPreview(null);
  };

  const toggleOnlyStatus = (s: string) =>
    setOnlyStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const handlePreview = async () => {
    try {
      const config = buildConfig();
      const res = await api.post("/merchants/webhook-config/preview", {
        config,
      });
      const result = res.data.data;
      if (!result.valid) {
        setPreview(null);
        setPreviewErrors(result.errors || []);
      } else {
        setPreviewErrors([]);
        setPreview(result.body);
      }
    } catch (e) {
      setPreview(null);
      setPreviewErrors([errMsg(e)]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = mode === "default" ? null : buildConfig();
      await api.put(`/merchants/${merchantId}/webhook-config`, { config });
      toast.success(
        mode === "default"
          ? "Merchant will use the default format"
          : "Webhook format saved",
      );
      navigate(-1);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset ${merchantName} to the default webhook format?`))
      return;
    setSaving(true);
    try {
      await api.put(`/merchants/${merchantId}/webhook-config`, {
        config: null,
      });
      toast.success("Reset to default format");
      navigate(-1);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className={PAGE_HEADER}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-md border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f5efe0] transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Webhook Format
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure the webhook payload this merchant receives
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg flex flex-col">
          {/* Mode selection */}
          <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Format Mode
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose between our standard payload or define a custom
                structure.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("default")}
                className={`px-5 py-2.5 rounded-md text-sm font-medium border transition ${
                  mode === "default"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Default Format
              </button>
              <button
                onClick={switchToCustom}
                className={`px-5 py-2.5 rounded-md text-sm font-medium border transition ${
                  mode === "custom"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Custom Format
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-8">
            {/* Default mode */}
            {mode === "default" && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Standard Payload
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  This merchant will receive our default webhook format:
                </p>
                <pre className="text-xs bg-white p-4 rounded-md border border-slate-200 overflow-x-auto text-slate-700">
                  {`{
  "event": "PAY_IN_STATUS_UPDATE",
  "data": {
    "id": 12345,
    "merchantReference": "ORDER-001",
    "status": "COMPLETED",
    "amount": 1000.00,
    "amountToCredit": 980.00,
    "completedAt": "2026-01-01T12:00:00Z",
    "failureReason": null
  },
  "timestamp": "2026-01-01T12:00:01Z"
}`}
                </pre>
              </div>
            )}

            {/* Custom mode */}
            {mode === "custom" && (
              <>
                {/* Fields section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Fields
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Map our internal fields to the keys the merchant
                        receives. Use dots for nested keys (e.g.{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          transaction.ref
                        </code>
                        ).
                      </p>
                    </div>
                    <button
                      onClick={loadTemplate}
                      className="text-xs px-3 py-1.5 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium whitespace-nowrap"
                    >
                      Load example template
                    </button>
                  </div>

                  <div className="space-y-3">
                    {rows.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                        <p className="text-sm text-slate-500">
                          No fields configured yet. Click "Add field" below or
                          load the example template.
                        </p>
                      </div>
                    )}

                    {rows.map((r, index) => (
                      <div
                        key={r.id}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3"
                      >
                        {/* Order arrows */}
                        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveRow(index, -1)}
                            disabled={index === 0}
                            title="Move up"
                            className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <span className="text-xs font-semibold text-slate-400">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveRow(index, 1)}
                            disabled={index === rows.length - 1}
                            title="Move down"
                            className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Row content */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <input
                              className={`${inputCls} col-span-3`}
                              placeholder="Output key"
                              value={r.outKey}
                              onChange={(e) =>
                                updateRow(r.id, { outKey: e.target.value })
                              }
                            />
                            <select
                              className={`${inputCls} col-span-3`}
                              value={r.from}
                              onChange={(e) =>
                                updateRow(r.id, { from: e.target.value })
                              }
                            >
                              {options.sources.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <select
                              className={`${inputCls} col-span-2`}
                              value={r.type}
                              onChange={(e) =>
                                updateRow(r.id, {
                                  type: e.target.value as FieldRow["type"],
                                })
                              }
                            >
                              <option value="">as is</option>
                              <option value="string">string</option>
                              <option value="number">number</option>
                            </select>
                            <div className="col-span-3 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={r.hasDefault}
                                onChange={(e) =>
                                  updateRow(r.id, {
                                    hasDefault: e.target.checked,
                                  })
                                }
                                title="Use a default when value is empty"
                                className="h-4 w-4 shrink-0"
                              />
                              <input
                                className={`${inputCls} w-full`}
                                placeholder="default if empty"
                                disabled={!r.hasDefault}
                                value={r.defaultValue}
                                onChange={(e) =>
                                  updateRow(r.id, {
                                    defaultValue: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <button
                              onClick={() =>
                                setRows((p) => p.filter((x) => x.id !== r.id))
                              }
                              title="Remove field"
                              className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-md justify-self-end"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={r.omitIfNull}
                              onChange={(e) =>
                                updateRow(r.id, {
                                  omitIfNull: e.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5"
                            />
                            Leave this key out when the value is empty
                          </label>

                          {r.from === "status" && (
                            <div className="bg-white border border-slate-200 rounded-md p-3">
                              <p className="text-xs font-medium text-slate-600 mb-2">
                                Status mapping (leave blank to send as-is)
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {options.statuses.map((s) => (
                                  <div
                                    key={s}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="text-xs text-slate-500 w-24 shrink-0 font-mono">
                                      {s}
                                    </span>
                                    <input
                                      className={`${inputCls} w-full`}
                                      placeholder="send as"
                                      value={r.map[s] || ""}
                                      onChange={(e) =>
                                        updateRow(r.id, {
                                          map: {
                                            ...r.map,
                                            [s]: e.target.value,
                                          },
                                        })
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setRows((p) => [...p, newRow()])}
                    className="mt-4 flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-dashed border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800 transition"
                  >
                    <Plus size={14} /> Add Field
                  </button>
                </div>

                {/* Statuses section */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    Status Filters
                  </h3>
                  <p className="text-sm text-slate-500 mb-3">
                    Send webhooks only for selected statuses. Leave all
                    unchecked to send for every status.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.statuses.map((s) => (
                      <label
                        key={s}
                        className={`px-4 py-2 rounded-md text-xs font-medium cursor-pointer border transition ${
                          onlyStatuses.includes(s)
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={onlyStatuses.includes(s)}
                          onChange={() => toggleOnlyStatus(s)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preview section */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Payload Preview
                  </h3>
                  {previewErrors.length > 0 && (
                    <ul className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-4 list-disc pl-6 mb-3 space-y-1">
                      {previewErrors.map((er, i) => (
                        <li key={i}>{er}</li>
                      ))}
                    </ul>
                  )}
                  {preview ? (
                    <pre className="text-xs bg-slate-900 text-green-300 p-5 rounded-lg overflow-x-auto leading-relaxed">
                      {JSON.stringify(preview, null, 2)}
                    </pre>
                  ) : (
                    previewErrors.length === 0 && (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center">
                        <p className="text-sm text-slate-500">
                          Click{" "}
                          <span className="font-semibold text-slate-700">
                            Preview
                          </span>{" "}
                          to see the payload this merchant will receive.
                        </p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap rounded-b-lg">
            <div>
              {hadCustom && (
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                >
                  <RotateCcw size={14} /> Reset to default
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="h-10 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              {mode === "custom" && (
                <button
                  onClick={handlePreview}
                  className="h-10 px-4 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-sm font-medium flex items-center gap-1.5 transition"
                >
                  <Eye size={14} /> Preview
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className={`${BTN_PRIMARY} h-10 disabled:opacity-50`}
              >
                <Save size={14} /> {saving ? "Saving..." : "Save Format"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
