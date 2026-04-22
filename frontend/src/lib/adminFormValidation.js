import { datetimeLocalToIso } from "./adminDatetime.js";

/**
 * Optional URL: empty OK; otherwise must be http(s) and parse as URL.
 */
export function validateOptionalHttpUrl(raw, label = "URL") {
  const t = (raw || "").trim();
  if (!t) return { ok: true, value: null, error: null };
  const low = t.toLowerCase();
  if (!low.startsWith("http://") && !low.startsWith("https://")) {
    return {
      ok: false,
      value: null,
      error: `${label} must start with http:// or https://.`,
    };
  }
  try {
    new URL(t);
  } catch {
    return { ok: false, value: null, error: `${label} is not a valid web address.` };
  }
  if (t.length > 500) {
    return { ok: false, value: null, error: `${label} must be at most 500 characters.` };
  }
  return { ok: true, value: t, error: null };
}

/** @returns {{ errors: Record<string, string>, trimmed: object }} */
export function validateClubAdminForm({
  name,
  description,
  city,
  location,
  websiteUrl,
}) {
  const errors = {};

  const trimmedName = (name || "").trim();
  if (!trimmedName) errors.name = "Club name is required.";
  else if (trimmedName.length > 255) errors.name = "Name must be at most 255 characters.";

  const desc = (description || "").trim();
  if (desc.length > 1000) errors.description = "Description must be at most 1000 characters.";

  const cityT = (city || "").trim();
  if (cityT.length > 100) errors.city = "City must be at most 100 characters.";

  const locT = (location || "").trim();
  if (locT.length > 255) errors.location = "Venue / location must be at most 255 characters.";

  const url = validateOptionalHttpUrl(websiteUrl, "Website URL");
  if (!url.ok) errors.website_url = url.error;

  return {
    errors,
    trimmed: {
      name: trimmedName,
      description: desc || null,
      city: cityT || null,
      location: locT || null,
      website_url: url.ok ? url.value : null,
    },
  };
}

/** @returns {{ errors: Record<string, string>, startIso: string|null, endIso: string|null, trimmed: object }} */
export function validateEventAdminForm({
  title,
  description,
  startLocal,
  endLocal,
  city,
  location,
  registrationUrl,
}) {
  const errors = {};

  const trimmedTitle = (title || "").trim();
  if (!trimmedTitle) errors.title = "Event title is required.";
  else if (trimmedTitle.length > 255) errors.title = "Title must be at most 255 characters.";

  const desc = (description || "").trim();
  if (desc.length > 2000) errors.description = "Description must be at most 2000 characters.";

  let startIso = null;
  if (!startLocal || !String(startLocal).trim()) {
    errors.start_time = "Start date and time are required.";
  } else {
    startIso = datetimeLocalToIso(startLocal);
    if (!startIso) errors.start_time = "Enter a valid start date and time.";
  }

  let endIso = null;
  if (endLocal && String(endLocal).trim()) {
    endIso = datetimeLocalToIso(endLocal);
    if (!endIso) errors.end_time = "Enter a valid end date and time.";
    else if (startIso && new Date(endIso) < new Date(startIso)) {
      errors.end_time = "End time must be on or after start time.";
    }
  }

  const cityT = (city || "").trim();
  if (cityT.length > 100) errors.city = "City must be at most 100 characters.";

  const locT = (location || "").trim();
  if (locT.length > 255) errors.location = "Location must be at most 255 characters.";

  const reg = validateOptionalHttpUrl(registrationUrl, "Registration URL");
  if (!reg.ok) errors.registration_url = reg.error;

  return {
    errors,
    startIso,
    endIso,
    trimmed: {
      title: trimmedTitle,
      description: desc || null,
      city: cityT || null,
      location: locT || null,
      registration_url: reg.ok ? reg.value : null,
    },
  };
}

/**
 * Map FastAPI / Pydantic 422 `detail` array to field keys (e.g. body.name → name).
 */
export function mapApiValidationToFieldErrors(detail) {
  if (!Array.isArray(detail)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const item of detail) {
    const loc = item.loc;
    if (!Array.isArray(loc)) continue;
    const bodyIdx = loc.indexOf("body");
    const field = bodyIdx >= 0 ? loc[bodyIdx + 1] : null;
    if (typeof field !== "string") continue;
    let msg = item.msg ? String(item.msg) : "Invalid value.";
    msg = msg.replace(/^Value error,\s*/i, "").trim();
    out[field] = msg;
  }
  return out;
}
