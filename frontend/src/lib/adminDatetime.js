/** Convert `<input type="datetime-local">` value to ISO string, or null if invalid. */
export function datetimeLocalToIso(value) {
  if (!value || !value.includes("T")) return null;
  const [datePart, timePart] = value.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const timeBits = (timePart || "0").split(":");
  const h = Number(timeBits[0]) || 0;
  const mi = Number(timeBits[1]) || 0;
  const local = new Date(y, mo - 1, d, h, mi, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** API ISO datetime → value for `datetime-local` input (local timezone). */
export function isoToDatetimeLocal(isoValue) {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
