import { apiFetch } from "../api/client.js";

export const CLUB_MEMBERSHIP_CHANGED_EVENT = "jeal:club-membership-changed";

export async function fetchJoinedClubs(userId, fetcher = apiFetch) {
  if (!userId) return [];
  const payload = await fetcher(`/users/${userId}/joined-clubs`);
  return Array.isArray(payload) ? payload : [];
}

export function createJoinedClubIdSet(joinedClubs) {
  return new Set((joinedClubs || []).map((club) => String(club.id)));
}

export function emitClubMembershipChanged(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLUB_MEMBERSHIP_CHANGED_EVENT, {
      detail,
    })
  );
}

export function subscribeToClubMembershipChanges(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => {
    callback(event.detail || {});
  };

  window.addEventListener(CLUB_MEMBERSHIP_CHANGED_EVENT, listener);
  return () =>
    window.removeEventListener(CLUB_MEMBERSHIP_CHANGED_EVENT, listener);
}
