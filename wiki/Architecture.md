# 🏗️ Architecture

## System overview

JEAL follows a classic three-tier web architecture: a React SPA in the browser communicates with a FastAPI backend over HTTP/JSON, which reads and writes to a PostgreSQL database.

```mermaid
graph TB
    subgraph Browser["🌐 Browser"]
        React["React 18 SPA\n(Vite + Tailwind CSS v4)"]
    end

    subgraph Backend["⚙️ Backend  •  Python 3.10+"]
        FastAPI["FastAPI application\n(Pydantic v2 validation)"]
        Auth["Auth middleware\nBearer UUID token"]
        Rec["Recommendation engine\nInterest-based scoring"]
        QR["QR check-in\nHMAC-SHA256 tokens"]
    end

    subgraph DB["🗄️ Database  •  PostgreSQL"]
        PG[(PostgreSQL)]
        Alembic["Alembic migrations\n+ seed data"]
    end

    React -->|"REST JSON\nHTTP"| FastAPI
    FastAPI --> Auth
    FastAPI --> Rec
    FastAPI --> QR
    FastAPI -->|"SQLAlchemy ORM"| PG
    Alembic -.->|"schema + seeds"| PG
```

---

## Frontend structure

```mermaid
graph LR
    subgraph Pages
        Login & Register
        Onboarding["Onboarding quiz"]
        Main["Main feed\n(recommendations)"]
        Clubs["Clubs directory"]
        Events["Events browser"]
        ClubDetail["Club detail"]
        EventDetail["Event detail"]
        Dashboard
        CheckIn["QR Check-in"]
        Admin["Admin panel"]
    end

    subgraph Components
        UI["ui/ — Button, Card,\nInput, Alert, Select"]
        Auth2["AuthContext\n(login state)"]
        Lib["lib/ — clubMemberships\nsavedItems\nemptyStateMessages"]
        API["api/client.js\n(apiFetch wrapper)"]
    end

    Pages --> Components
```

**Routing** is handled by React Router v6. All authenticated pages read the logged-in `user_id` from `AuthContext` and attach it as an `Authorization: Bearer <uuid>` header via the shared `apiFetch` helper.

---

## Backend structure

```mermaid
graph TD
    subgraph main.py
        Endpoints["REST endpoints\n/register /login /me\n/clubs /events\n/recommendations\n/check-in\n/admin/*"]
        Validators["Pydantic models\n(request + response schemas)"]
        Scoring["Scoring helpers\n_score_club_for_user\n_score_event_for_user\n_build_similar_user_matches"]
        Tokens["QR token helpers\n_sign_check_in_payload\n_verify_check_in_token"]
    end

    subgraph models.py
        ORM["SQLAlchemy ORM models"]
    end

    subgraph database.py
        Session["SessionLocal\nengine + Base"]
    end

    Endpoints --> Validators
    Endpoints --> Scoring
    Endpoints --> Tokens
    Endpoints --> ORM
    ORM --> Session
```

---

## Database schema

```mermaid
erDiagram
    users {
        uuid id PK
        string email
        string password_hash
        string first_name
        string last_name
        string faculty
        string programme
        string city
        string participation_preference
        bool is_admin
    }

    interest_categories {
        uuid id PK
        string name
    }

    interests {
        uuid id PK
        uuid category_id FK
        string name
    }

    clubs {
        uuid id PK
        uuid category_id FK
        string name
        string city
        string location
        int meeting_weekday
        time meeting_start_time
        time meeting_end_time
        bool is_active
    }

    events {
        uuid id PK
        uuid category_id FK
        uuid club_id FK
        string title
        datetime start_time
        datetime end_time
        string city
        int max_capacity
        bool is_online
        bool is_active
    }

    user_interests {
        uuid user_id FK
        uuid interest_id FK
        string level
    }

    club_interests {
        uuid club_id FK
        uuid interest_id FK
    }

    user_club_memberships {
        uuid user_id FK
        uuid club_id FK
    }

    user_event_registrations {
        uuid user_id FK
        uuid event_id FK
    }

    user_event_waitlist_entries {
        uuid user_id FK
        uuid event_id FK
        datetime created_at
    }

    event_attendance {
        uuid user_id FK
        uuid event_id FK
        datetime checked_in_at
        string check_in_method
    }

    club_activity_attendance {
        uuid user_id FK
        uuid club_id FK
        datetime activity_start_time
        string check_in_method
    }

    event_feedback {
        uuid user_id FK
        uuid event_id FK
        int rating
        string comment
    }

    club_activity_feedback {
        uuid user_id FK
        uuid club_id FK
        datetime activity_start_time
        int rating
        string comment
    }

    user_saved_clubs {
        uuid user_id FK
        uuid club_id FK
    }

    user_saved_events {
        uuid user_id FK
        uuid event_id FK
    }

    users ||--o{ user_interests : has
    users ||--o{ user_club_memberships : joins
    users ||--o{ user_event_registrations : registers
    users ||--o{ user_event_waitlist_entries : waitlists
    users ||--o{ event_attendance : attends
    users ||--o{ club_activity_attendance : attends
    users ||--o{ event_feedback : submits
    users ||--o{ club_activity_feedback : submits
    users ||--o{ user_saved_clubs : saves
    users ||--o{ user_saved_events : saves

    interest_categories ||--o{ interests : contains
    interest_categories ||--o{ clubs : categorises
    interest_categories ||--o{ events : categorises

    interests ||--o{ user_interests : linked
    interests ||--o{ club_interests : linked

    clubs ||--o{ club_interests : has
    clubs ||--o{ user_club_memberships : has
    clubs ||--o{ events : organises
    clubs ||--o{ club_activity_attendance : tracks
    clubs ||--o{ club_activity_feedback : receives

    events ||--o{ user_event_registrations : has
    events ||--o{ user_event_waitlist_entries : has
    events ||--o{ event_attendance : tracks
    events ||--o{ event_feedback : receives
```

---

## Recommendation algorithm

```mermaid
flowchart TD
    A([User opens /recommendations]) --> B[Load user's interests\nand interest categories]
    B --> C{Any interests\nselected?}
    C -->|No| Z([Return empty list])
    C -->|Yes| D[Build category → count map\nBuild interest ID set]

    D --> E[Query all active clubs]
    D --> F[Query all active future events]

    E --> G["Score each club\nexact interest matches × 3\n+ category interest count"]
    F --> H["Score each event\nclub interest matches × 3\n+ max(event cat, club cat)"]

    G --> I{participation\npreference?}
    H --> I

    I -->|clubs| J["clubs × 1.25\nevents × 0.75"]
    I -->|events| K["events × 1.25\nclubs × 0.75"]
    I -->|both| L["no multiplier"]

    J & K & L --> M[Sort by score desc\nfilter score > 0\ntake top N]
    M --> N[Build explanation strings\ne.g. 'matches your Programming interests']
    N --> O([Return ranked clubs + events])
```

---

## QR check-in flow

```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant DB
    participant Student

    Admin->>API: GET /events/{id}/check-in-token
    API->>API: Build payload {type, event_id}
    API->>API: HMAC-SHA256 sign payload
    API-->>Admin: token + QR data

    Admin->>Admin: Display QR code on screen

    Student->>API: POST /check-in {token}
    API->>API: Verify HMAC signature
    API->>DB: Check if already checked in
    DB-->>API: not found
    API->>DB: Insert attendance record
    API-->>Student: ✅ checked_in_at, title
```

---

## Similar users algorithm

```mermaid
flowchart LR
    A[Current user\ninterest IDs] --> B[Build binary vector\nover all interests]
    C[Each other active user\ninterest IDs] --> D[Build binary vector]
    B & D --> E[Cosine similarity]
    E --> F{Shared\ninterests?}
    F -->|None| G[Skip]
    F -->|≥ 1| H[Add faculty boost +0.1\nif same faculty]
    H --> I[Add programme boost +0.1\nif same programme]
    I --> J[Cap score at 1.0]
    J --> K[Sort desc, take top 10]
    K --> L[Return: name, programme,\nfaculty, shared interests only]
```

*Only privacy-safe fields are exposed — no email, no user ID, no location.*
