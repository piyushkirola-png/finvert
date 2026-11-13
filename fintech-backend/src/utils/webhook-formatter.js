"use strict";

const PAY_IN_EVENT = "PAY_IN_STATUS_UPDATE";
const CONFIG_VERSION = 1;
const MAX_CONFIG_BYTES = 10 * 1024;
const MAX_FIELDS = 50;

const PAY_IN_STATUSES = ["COMPLETED", "PENDING", "FAILED"];

// Only these fields can ever be sent to a merchant
const PAY_IN_SOURCES = [
  "id",
  "merchantReference",
  "status",
  "currency",
  "paymentMode",
  "amount",
  "amountToCredit",
  "amountInINR",
  "fxRate",
  "feeAmount",
  "taxAmount",
  "utr",
  "completedAt",
  "requestedAt",
  "failureReason",
  "failureCode",
  "customerName",
  "customerEmail",
  "customerPhone",
];

const NUMERIC_SOURCES = new Set([
  "amount",
  "amountToCredit",
  "amountInINR",
  "fxRate",
  "feeAmount",
  "taxAmount",
]);

const ALLOWED_TYPES = ["string", "number"];
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const OUTPUT_KEY_REGEX = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const isPrimitive = (v) =>
  v === null || ["string", "number", "boolean"].includes(typeof v);

// ---------------------------------------------------------------------------
// Config validation (run when an admin saves a merchant's config)
// ---------------------------------------------------------------------------
function validateWebhookConfig(config) {
  const errors = [];

  if (!isPlainObject(config)) {
    return { valid: false, errors: ["Config must be a JSON object"] };
  }

  if (JSON.stringify(config).length > MAX_CONFIG_BYTES) {
    errors.push(`Config is too large (max ${MAX_CONFIG_BYTES} bytes)`);
  }

  if (config.version !== CONFIG_VERSION) {
    errors.push(`"version" must be ${CONFIG_VERSION}`);
  }

  const outputKeys = [];

  const checkOutputKey = (key, where) => {
    if (!OUTPUT_KEY_REGEX.test(key)) {
      errors.push(
        `${where} key "${key}" is invalid (use letters, numbers, _ and dots only)`,
      );
      return false;
    }
    if (key.split(".").some((part) => FORBIDDEN_KEYS.has(part))) {
      errors.push(`${where} key "${key}" uses a forbidden name`);
      return false;
    }
    outputKeys.push(key);
    return true;
  };

  // fields
  if (
    !isPlainObject(config.fields) ||
    Object.keys(config.fields).length === 0
  ) {
    errors.push(`"fields" must be an object with at least one field`);
  } else {
    const entries = Object.entries(config.fields);
    if (entries.length > MAX_FIELDS) {
      errors.push(`"fields" can have at most ${MAX_FIELDS} entries`);
    }

    for (const [outKey, rule] of entries) {
      if (!checkOutputKey(outKey, "fields")) continue;

      if (!isPlainObject(rule)) {
        errors.push(`fields.${outKey} must be an object`);
        continue;
      }

      if (!PAY_IN_SOURCES.includes(rule.from)) {
        errors.push(
          `fields.${outKey}.from "${rule.from}" is not allowed. Allowed: ${PAY_IN_SOURCES.join(", ")}`,
        );
      }

      if (rule.type !== undefined && !ALLOWED_TYPES.includes(rule.type)) {
        errors.push(
          `fields.${outKey}.type must be one of: ${ALLOWED_TYPES.join(", ")}`,
        );
      }

      if (rule.map !== undefined) {
        if (!isPlainObject(rule.map)) {
          errors.push(`fields.${outKey}.map must be an object`);
        } else {
          for (const [k, v] of Object.entries(rule.map)) {
            if (FORBIDDEN_KEYS.has(k)) {
              errors.push(`fields.${outKey}.map has forbidden key "${k}"`);
            }
            if (!isPrimitive(v)) {
              errors.push(
                `fields.${outKey}.map["${k}"] must be a string, number or boolean`,
              );
            }
          }
        }
      }

      if (rule.default !== undefined && !isPrimitive(rule.default)) {
        errors.push(
          `fields.${outKey}.default must be a string, number, boolean or null`,
        );
      }

      if (
        rule.omitIfNull !== undefined &&
        typeof rule.omitIfNull !== "boolean"
      ) {
        errors.push(`fields.${outKey}.omitIfNull must be true or false`);
      }
    }
  }

  // static
  if (config.static !== undefined) {
    if (!isPlainObject(config.static)) {
      errors.push(`"static" must be an object`);
    } else {
      for (const [k, v] of Object.entries(config.static)) {
        if (!checkOutputKey(k, "static")) continue;
        if (!isPrimitive(v)) {
          errors.push(`static.${k} must be a string, number, boolean or null`);
        }
      }
    }
  }

  // onlyStatuses
  if (config.onlyStatuses !== undefined) {
    if (
      !Array.isArray(config.onlyStatuses) ||
      config.onlyStatuses.length === 0
    ) {
      errors.push(`"onlyStatuses" must be a non-empty array`);
    } else {
      for (const s of config.onlyStatuses) {
        if (!PAY_IN_STATUSES.includes(s)) {
          errors.push(`onlyStatuses has unknown status "${s}"`);
        }
      }
    }
  }

  // order (jsonb does not keep object key order, so it is stored as an array)
  if (config.order !== undefined) {
    if (!Array.isArray(config.order)) {
      errors.push(`"order" must be an array of field keys`);
    } else {
      const fieldKeys = isPlainObject(config.fields)
        ? Object.keys(config.fields)
        : [];
      for (const k of config.order) {
        if (!fieldKeys.includes(k)) {
          errors.push(`order has unknown key "${k}"`);
        }
      }
    }
  }

  // output key conflicts, e.g. "a" and "a.b" cannot both exist
  for (let i = 0; i < outputKeys.length; i++) {
    for (let j = 0; j < outputKeys.length; j++) {
      if (i !== j && outputKeys[j].startsWith(outputKeys[i] + ".")) {
        errors.push(`Key "${outputKeys[i]}" conflicts with "${outputKeys[j]}"`);
      }
      if (i < j && outputKeys[i] === outputKeys[j]) {
        errors.push(`Duplicate output key "${outputKeys[i]}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Source builder: PayInRequest -> safe plain values
// ---------------------------------------------------------------------------
function buildPayInSource(payIn) {
  const src = {};

  for (const field of PAY_IN_SOURCES) {
    if (field === "utr") {
      src.utr = payIn.metadata?.utr ?? payIn.metadata?.rawPayload?.utr ?? null;
      continue;
    }

    let v = payIn[field];
    if (v === undefined || v === null) {
      src[field] = null;
      continue;
    }

    if (NUMERIC_SOURCES.has(field)) v = Number(v);
    else if (v instanceof Date) v = v.toISOString();

    src[field] = v;
  }

  return src;
}

// ---------------------------------------------------------------------------
// Formatter engine (same code for every merchant)
// ---------------------------------------------------------------------------
function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) {
    if (!isPlainObject(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function castValue(v, type) {
  if (v === null || v === undefined) return v;
  if (type === "string") return String(v);
  if (type === "number") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return v;
}

// Assumes the config was already validated
function formatWithConfig(config, source) {
  const body = {};

  const fieldKeys = Object.keys(config.fields);
  const orderedKeys = Array.isArray(config.order)
    ? [
        ...config.order.filter((k) => fieldKeys.includes(k)),
        ...fieldKeys.filter((k) => !config.order.includes(k)),
      ]
    : fieldKeys;

  for (const outKey of orderedKeys) {
    const rule = config.fields[outKey];
    let v = source[rule.from];

    if (
      rule.map &&
      v !== null &&
      v !== undefined &&
      Object.prototype.hasOwnProperty.call(rule.map, String(v))
    ) {
      v = rule.map[String(v)];
    }

    if (v === null || v === undefined) {
      v = rule.default !== undefined ? rule.default : null;
    }

    if (v === null && rule.omitIfNull) continue;

    setByPath(body, outKey, castValue(v, rule.type));
  }

  for (const [k, v] of Object.entries(config.static || {})) {
    setByPath(body, k, v);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Default payload + main entry point (called from payin service)
// ---------------------------------------------------------------------------
function buildDefaultPayInPayload(payIn, timestamp = new Date().toISOString()) {
  return {
    event: PAY_IN_EVENT,
    data: {
      id: payIn.id,
      merchantReference: payIn.merchantReference,
      status: payIn.status,
      amount: Number(payIn.amount),
      amountToCredit: Number(payIn.amountToCredit),
      completedAt: payIn.completedAt,
      failureReason: payIn.failureReason,
    },
    timestamp,
  };
}

// Returns { body, mode }: CONFIG | DEFAULT | FALLBACK_DEFAULT | SKIPPED (body null)
function buildMerchantWebhook(merchant, payIn) {
  const tag = `[WebhookFormatter][merchant:${merchant?.id}]`;
  const timestamp = new Date().toISOString();

  if (!merchant?.webhookConfig) {
    return {
      body: buildDefaultPayInPayload(payIn, timestamp),
      mode: "DEFAULT",
    };
  }

  const config = merchant.webhookConfig;

  const check = validateWebhookConfig(config);
  if (!check.valid) {
    console.error(`${tag} Invalid webhookConfig, using default:`, check.errors);
    return {
      body: buildDefaultPayInPayload(payIn, timestamp),
      mode: "FALLBACK_DEFAULT",
    };
  }

  if (config.onlyStatuses && !config.onlyStatuses.includes(payIn.status)) {
    console.log(`${tag} Status ${payIn.status} not in onlyStatuses, skipping`);
    return { body: null, mode: "SKIPPED" };
  }

  try {
    const body = formatWithConfig(config, buildPayInSource(payIn));
    return { body, mode: "CONFIG" };
  } catch (err) {
    console.error(`${tag} Formatter crashed, using default:`, err.message);
    return {
      body: buildDefaultPayInPayload(payIn, timestamp),
      mode: "FALLBACK_DEFAULT",
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers for admin API / frontend preview
// ---------------------------------------------------------------------------
const SAMPLE_PAY_IN = {
  id: 27,
  merchantReference: "ORD-xa123432327890",
  status: "COMPLETED",
  currency: "INR",
  paymentMode: "UPI",
  amount: 10,
  amountToCredit: 8,
  amountInINR: null,
  fxRate: null,
  feeAmount: 2,
  taxAmount: 0,
  completedAt: new Date(),
  requestedAt: new Date(),
  failureReason: null,
  failureCode: null,
  customerName: "Test User",
  customerEmail: "test@example.com",
  customerPhone: "9999999999",
  metadata: { utr: "571166415434" },
};

function previewWebhook(config, samplePayIn = SAMPLE_PAY_IN) {
  const check = validateWebhookConfig(config);
  if (!check.valid) return { valid: false, errors: check.errors, body: null };
  return {
    valid: true,
    errors: [],
    body: formatWithConfig(config, buildPayInSource(samplePayIn)),
  };
}

const getAllowedSources = () => [...PAY_IN_SOURCES];
const getAllowedStatuses = () => [...PAY_IN_STATUSES];

module.exports = {
  buildMerchantWebhook,
  validateWebhookConfig,
  previewWebhook,
  getAllowedSources,
  getAllowedStatuses,
  formatWithConfig,
  buildPayInSource,
  buildDefaultPayInPayload,
};
