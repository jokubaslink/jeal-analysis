import { apiFetch } from "../api/client.js";

export const SAVED_ITEM_CHANGED_EVENT = "jeal:saved-item-changed";

export async function fetchSavedClubs(userId, fetcher = apiFetch) {
  if (!userId) return [];
  const payload = await fetcher(`/users/${userId}/saved-clubs`);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchSavedEvents(userId, fetcher = apiFetch) {
  if (!userId) return [];
  const payload = await fetcher(`/users/${userId}/saved-events`);
  return Array.isArray(payload) ? payload : [];
}

export function createSavedClubIdSet(savedClubs) {
  return new Set((savedClubs || []).map((club) => String(club.id)));
}

export function createSavedEventIdSet(savedEvents) {
  return new Set((savedEvents || []).map((event) => String(event.id)));
}

export function emitSavedItemChanged(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAVED_ITEM_CHANGED_EVENT, { detail }));
}

export function subscribeToSavedItemChanges(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => {
    callback(event.detail || {});
  };

  window.addEventListener(SAVED_ITEM_CHANGED_EVENT, listener);
  return () => window.removeEventListener(SAVED_ITEM_CHANGED_EVENT, listener);
}
