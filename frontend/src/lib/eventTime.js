/**
 * Event is considered past when its end (or start if no end) is before now.
 */
export function isEventPast(event) {
  if (!event) return false;
  const raw = event.end_time || event.start_time;
  if (!raw) return false;
  const ms = new Date(raw).getTime();
  if (Number.isNaN(ms)) return false;
  return ms < Date.now();
}
