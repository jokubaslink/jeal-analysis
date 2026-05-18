# Plan: QR attendance tracking (clubs & events)

This document plans **tracking and reporting** on top of the QR check-in flow that already exists. QR generation, scan URLs, and database persistence are largely in place; the work ahead is mostly **admin visibility**, **aggregates**, and optional **export** so attendance supports statistics and operational tracking.

---

## 1. Goals (mapped to acceptance criteria)

| Criterion | Current state | Tracking work |
|-----------|----------------|---------------|
| QR for selected club or event | Admin endpoints issue signed tokens; UI builds QR images (`AdminClubs.jsx`, `AdminEvents.jsx`). | None beyond polish if desired (e.g. print stylesheet already varies by page). |
| Download / print | QR shown via external image URL; browser print applies. | Optional: explicit “Download PNG” using canvas or server-side QR lib for offline branding—**not required** for tracking. |
| Scan → attendance / registration action | `/check-in?token=…` → `POST /attendance/check-in` writes rows. Events require prior registration; clubs require membership + valid activity window. | Ensure admin-facing docs/UI explain prerequisites so scans succeed in the field. |
| Attendance for statistics | Rows exist (`event_attendance`, `club_activity_attendance`) with `checked_in_at`, `check_in_method`. | **New:** admin APIs + UI (and optional CSV) to read aggregates and attendee lists. |
| Works for clubs and events | Both paths implemented in `check_in_with_token` (`backend/app/main.py`). | Mirror reporting for both entity types in admin UI. |

---

## 2. Current architecture (inventory)

### End-user behaviour: QR scan counts as attendance (already implemented)

When an **authenticated** user opens the link encoded in the QR (`/check-in?token=…`), the check-in page calls **`POST /attendance/check-in`**. On success the backend **creates or confirms** an attendance row:

- **Events:** `EventAttendance` for that user and event → the user is treated as **having attended** (`GET /events/{event_id}/attendance` returns `attended: true`, `checked_in_at` set). Submitting feedback remains gated on this row.
- **Clubs:** `ClubActivityAttendance` for that user, club, and **`activity_start_time`** embedded in the token → attendance is recorded **for that specific club session**.

If the user was already checked in, the API responds with **`already_checked_in`** but attendance remains recorded (no duplicate row). **Scanning alone does not register** someone for an event or join a club—those prerequisites must already be satisfied or the check-in is rejected.

### Backend

- **Signed tokens:** `_sign_check_in_payload` / `_verify_check_in_token`; secret `CHECK_IN_TOKEN_SECRET`.
- **Admin token issuance:**
  - `GET /admin/events/{event_id}/check-in-token`
  - `GET /admin/clubs/{club_id}/check-in-token` (optional `activity_start_time` query for the specific occurrence).
- **User check-in:** `POST /attendance/check-in` with `{ "token": "..." }` (authenticated).
- **Persistence:**
  - `EventAttendance`: PK `(user_id, event_id)` — one check-in row per user per event.
  - `ClubActivityAttendance`: PK `(user_id, club_id, activity_start_time)` — one row per user per club session.
- **User-facing read:** `GET /events/{event_id}/attendance` for the current user (feeds feedback gating).

### Frontend

- **Check-in page:** `frontend/src/pages/CheckIn.jsx` posts token on load.
- **Admin QR:** Clubs/events admin lists fetch check-in token and show QR (`qrserver.com`).

### Not implemented yet (gap)

- No **`/admin/.../attendance`** (or global admin attendance summary) endpoints.
- No admin UI table showing **who checked in**, **when**, or **counts vs registrations** (events) / **members** (clubs).

---

## 3. Product decisions (resolve early)

1. **PII on admin screens:** Mirror `/admin/feedback` patterns (`user_email`, `user_name`, ids)—consistent with existing admin surface; confirm policy if production needs pseudonymisation.
2. **Club statistics granularity:** Attendance is keyed by **`activity_start_time`**. Reporting should group by that datetime (and optionally join club schedule helpers already used for feedback validation).
3. **Event funnel metrics:** Useful derived metrics: `registered_count`, `checked_in_count`, `check_in_rate` (requires joining `UserEventRegistration` with `EventAttendance`).
4. **Time zones:** Store and display using existing ISO timestamps; admin filters should accept UTC or explicit offsets consistent with the rest of the app.

---

## 4. Proposed backend APIs

Implement admin-only routes (same `require_admin_user` dependency as existing admin endpoints).

### 4.1 Event attendance

- **`GET /admin/events/{event_id}/attendance`**
  - Returns: `{ "event_id", "title", "checked_in_count", "registered_count", "attendees": [...] }`
  - Each attendee: `user_id`, `email`, `display_name`, `checked_in_at`, `check_in_method` (default `qr`).
  - Ordering: `checked_in_at` ascending or descending (query param).

### 4.2 Club attendance

- **`GET /admin/clubs/{club_id}/attendance`**
  - Query: optional `activity_start_time` — if omitted, return **all sessions** for that club with per-session summaries, or paginate recent sessions (pick one UX-driven behaviour).
  - Returns per session: `activity_start_time`, `checked_in_count`, optional `member_count` (from memberships), `attendees`: same shape as events where applicable.

### 4.3 Cross-cutting summary (optional phase 2)

- **`GET /admin/attendance/summary`** — recent check-ins across events and clubs (similar spirit to `GET /admin/feedback`), with filters (`from`, `to`, `type=event|club`).

### 4.4 Export (optional)

- **`GET /admin/events/{event_id}/attendance.csv`** and **`GET /admin/clubs/{club_id}/attendance.csv`**  
  - Same rows as JSON endpoints; `Content-Disposition: attachment`.  
  - Keeps GDPR/export audits simple for organisers.

### Response models

Add Pydantic models next to existing admin schemas in `main.py` (e.g. `AdminEventAttendanceOut`, `AdminClubSessionAttendanceOut`), following `AdminFeedbackSummaryOut` style.

---

## 5. Proposed frontend work

1. **Event admin:** On `AdminEvents.jsx` (or event detail if introduced), add “Attendance” — count badge + modal/drawer/table loaded from `GET /admin/events/{id}/attendance`; optional CSV link.
2. **Club admin:** On `AdminClubs.jsx`, add “Attendance” — session selector when multiple `activity_start_time` values exist; list attendees + counts.
3. **Optional global page:** `/admin/attendance` listing recent activity (if summary endpoint is built).

Reuse existing **`apiFetch`**, **`Card`**, **`Alert`**, loading/error patterns from admin clubs/events pages.

---

## 6. Statistics & analytics (without new tables)

Derived metrics available from existing schema:

- **Events:** check-ins vs registrations; repeat attendance per user across events (cross-query).
- **Clubs:** attendance per recurring slot (`activity_start_time`); trend over weeks if UI charts added later.

If future requirements need **anonymous counts only**, consider aggregating at query time rather than new tables until volume demands materialised views.

---

## 7. Testing strategy

- **Backend:** pytest or FastAPI `TestClient` tests for new admin routes:
  - Non-admin → 403.
  - Empty attendance → zero counts, empty list.
  - After `POST /attendance/check-in` (with seeded user + registration/membership), admin GET returns expected row.
- **Frontend:** Smoke test manually or lightweight component test if the project adds RTL later.

---

## 8. Implementation phases

| Phase | Scope |
|-------|--------|
| **MVP** | `GET /admin/events/{event_id}/attendance`, `GET /admin/clubs/{club_id}/attendance` + minimal admin UI tables and counts. |
| **M1** | CSV export for both; session filtering UX polished for clubs. |
| **M2** | `GET /admin/attendance/summary` + dashboard page; optional charts. |

---

## 9. Files likely touched

| Area | Files |
|------|--------|
| API & schemas | `backend/app/main.py` |
| Models | None required initially (`backend/app/models.py` already has attendance tables) |
| Admin UI | `frontend/src/pages/admin/AdminEvents.jsx`, `AdminClubs.jsx`; routing in `frontend/src/App.jsx` if new page |
| Docs | This plan; optionally extend `README.md` with admin attendance URLs after implementation |

---

## 10. Out of scope (unless requirements change)

- Replacing external QR image API with first-party PNG generation.
- Changing token semantics (e.g. one-time tokens); current HMAC tokens are stateless and sufficient for tracking **counts**, not for detecting QR reuse fraud beyond “same user idempotent check-in”.
- Public/anonymous attendance leaderboard without auth.

---

## Summary

**Tracking** means exposing persisted `EventAttendance` and `ClubActivityAttendance` to admins with counts, attendee lists, and optional export—built symmetrically for events and clubs, aligned with existing `/admin/feedback` patterns. No migration is strictly required for MVP; implementation is primarily new read endpoints and admin UI wiring.
