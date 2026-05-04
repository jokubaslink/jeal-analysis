import { apiFetch } from "../api/client.js";

export const EVENT_REGISTRATION_CHANGED_EVENT = "jeal:event-registration-changed";

export async function fetchRegisteredEvents(userId, fetcher = apiFetch) {
  if (!userId) return [];
  const payload = await fetcher(`/users/${userId}/registered-events`);
  return Array.isArray(payload) ? payload : [];
}

export function createRegisteredEventIdSet(registeredEvents) {
  return new Set((registeredEvents || []).map((event) => String(event.id)));
}

export function emitEventRegistrationChanged(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_REGISTRATION_CHANGED_EVENT, {
      detail,
    })
  );
}

export function subscribeToEventRegistrationChanges(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => {
    callback(event.detail || {});
  };

  window.addEventListener(EVENT_REGISTRATION_CHANGED_EVENT, listener);
  return () =>
    window.removeEventListener(EVENT_REGISTRATION_CHANGED_EVENT, listener);
}
