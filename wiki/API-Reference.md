# 🔌 API Reference

Base URL: `http://127.0.0.1:8000`
Interactive docs: **http://127.0.0.1:8000/docs** (Swagger UI)

## Authentication

All authenticated endpoints require:

```
Authorization: Bearer <user_id>
```

Where `<user_id>` is the UUID returned by `/login` or `/register`.

---

## Auth & users

### `POST /register`
Create a new account.

**Request**
```json
{
  "email": "student@uni.lt",
  "password": "Study2024!",
  "first_name": "Jonas",
  "last_name": "Jonaitis",
  "faculty": "Informatics",
  "programme": "Software Engineering",
  "city": "Kaunas",
  "participation_preference": "both"
}
```

**Response `200`**
```json
{ "message": "Registration successful.", "user_id": "<uuid>" }
```

**Validation errors `422`** — weak password, missing fields.

---

### `POST /login`
**Request**
```json
{ "email": "student@uni.lt", "password": "Study2024!" }
```
**Response `200`**
```json
{ "message": "Login successful", "user_id": "<uuid>", "is_admin": false }
```

---

### `GET /me` 🔒
Returns the current user's full profile including `is_admin` and `show_in_attendee_suggestions`.

---

### `PATCH /users/{user_id}`
Update profile fields (name, faculty, programme, city, participation_preference, …).

---

## Interests

### `GET /interest-categories`
Returns all interest categories.
```json
[{ "id": "<uuid>", "name": "STEM", "description": "..." }]
```

### `GET /interests?category_id=<uuid>`
Returns interests, optionally filtered by category.

### `PUT /users/{user_id}/interests` 🔒
Replace the user's interests entirely.
```json
{
  "items": [
    { "interest_id": "<uuid>", "level": "high" },
    { "interest_id": "<uuid>", "level": "medium" }
  ]
}
```
`level` can be `"high"`, `"medium"`, `"low"`, or `null`.

### `GET /users/{user_id}/interests` 🔒
Returns interests with category info for a user.

---

## Recommendations

### `GET /recommendations` 🔒
Returns personalised ranked clubs and events.

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `club_limit` | 10 | Max clubs returned |
| `event_limit` | 10 | Max events returned |

**Response**
```json
{
  "clubs": [
    {
      "id": "<uuid>",
      "name": "KTU Robotics Club",
      "category_name": "STEM",
      "score": 9,
      "recommendation_explanation": "Recommended because it matches your Programming and Electronics interests."
    }
  ],
  "events": [
    {
      "id": "<uuid>",
      "title": "Hack4Vilnius 2026",
      "start_time": "2026-03-15T10:00:00+00:00",
      "capacity_status": "available",
      "score": 6,
      "recommendation_explanation": "Recommended because it fits your STEM interest area."
    }
  ]
}
```

---

## Clubs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/clubs` | — | List all active clubs |
| `POST` | `/clubs` | 🔒 Admin | Create a club |
| `GET` | `/clubs/{id}` | — | Club detail |
| `PATCH` | `/clubs/{id}` | 🔒 Admin | Update club |
| `DELETE` | `/clubs/{id}` | 🔒 Admin | Delete club |
| `POST` | `/clubs/{id}/join` | 🔒 | Join club |
| `DELETE` | `/clubs/{id}/join` | 🔒 | Leave club |
| `POST` | `/clubs/{id}/save` | 🔒 | Save club |
| `DELETE` | `/clubs/{id}/save` | 🔒 | Unsave club |
| `GET` | `/clubs/{id}/check-in-token` | 🔒 Admin | Generate QR token |
| `GET` | `/clubs/{id}/feedback` | 🔒 | Get feedback opportunities |
| `POST` | `/clubs/{id}/feedback` | 🔒 | Submit club session feedback |

**Create club body**
```json
{
  "name": "Robotics Club",
  "description": "Build and program robots together.",
  "city": "Kaunas",
  "location": "Building A, Room 101",
  "category_id": "<uuid>",
  "meeting_weekday": 2,
  "meeting_start_time": "18:00",
  "meeting_end_time": "20:00",
  "website_url": "https://example.com",
  "image_url": "https://example.com/image.jpg"
}
```
`meeting_weekday`: 0 = Monday … 6 = Sunday.

---

## Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/events` | — | List events |
| `POST` | `/events` | 🔒 Admin | Create event |
| `GET` | `/events/{id}` | — | Event detail |
| `PATCH` | `/events/{id}` | 🔒 Admin | Update event |
| `DELETE` | `/events/{id}` | 🔒 Admin | Delete event |
| `POST` | `/events/{id}/register` | 🔒 | Register (auto-waitlists if full) |
| `DELETE` | `/events/{id}/register` | 🔒 | Cancel registration |
| `GET` | `/events/{id}/registration-status` | 🔒 | Check registration status |
| `POST` | `/events/{id}/save` | 🔒 | Save event |
| `DELETE` | `/events/{id}/save` | 🔒 | Unsave event |
| `GET` | `/events/{id}/check-in-token` | 🔒 Admin | Generate QR token |
| `GET` | `/events/{id}/attendee-suggestions` | 🔒 | Similar attendees |
| `POST` | `/events/{id}/feedback` | 🔒 | Submit feedback (after event ends) |

**List events query params**

| Param | Description |
|-------|-------------|
| `category_id` | Filter by interest category |
| `club_id` | Filter by organising club |
| `city` | Filter by city |

**Event registration status response**
```json
{
  "registration_status": "registered",
  "registered_at": "2026-03-10T14:22:00+00:00",
  "waitlisted_at": null,
  "waitlist_position": null,
  "capacity_status": "available",
  "remaining_capacity": 12
}
```
`registration_status` is one of: `"registered"`, `"waitlisted"`, `"none"`.

---

## Check-in

### `POST /check-in` 🔒
Redeem a QR token to record attendance.

**Request**
```json
{ "token": "<signed-token-string>" }
```
**Response `200`**
```json
{
  "type": "event",
  "title": "Hack4Vilnius 2026",
  "activity_start_time": null,
  "checked_in_at": "2026-03-15T10:05:33+00:00",
  "already_checked_in": false
}
```

---

## Similar users

### `GET /users/similar` 🔒
Returns privacy-safe similar student suggestions for the logged-in user.

**Response**
```json
[
  {
    "name": "Marija J.",
    "programme": "Software Engineering",
    "faculty": "Informatics",
    "shared_interest_count": 5,
    "shared_interests": ["Programming", "Robotics", "AI", "Gaming", "Open Source"]
  }
]
```

---

## Admin endpoints 🔒 Admin only

| Endpoint | Description |
|----------|-------------|
| `GET /admin/feedback` | All event + club activity feedback |
| `GET /admin/attendance` | Daily check-in overview (optionally scoped to club or event) |
| `GET /admin/attendance/events/{id}` | Per-event attendee list |
| `GET /admin/attendance/clubs/{id}` | Per-club session attendee list |
| `PATCH /clubs/{id}/visibility` | Toggle club active/inactive |
| `PATCH /events/{id}/visibility` | Toggle event active/inactive |

---

## Error responses

| Status | Meaning |
|--------|---------|
| `400` | Bad request — validation failed or business rule violated |
| `401` | Not authenticated — missing or invalid Bearer token |
| `403` | Forbidden — admin access required |
| `404` | Resource not found |
| `422` | Pydantic validation error — check the `detail` array |
| `503` | Database connection failed — PostgreSQL not running |
