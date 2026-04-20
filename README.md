# jeal-analysis

### UI design system (frontend)

The app uses a shared **visual style guide** so colors, type, spacing, and components stay consistent:

| Resource | Purpose |
|----------|---------|
| **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** | Written spec: palette, typography scale, spacing tokens, button/input/card recipes |
| **`frontend/public/style-guide.html`** | Visual style guide (swatches, type, spacing, components) |
| **`frontend/src/styles/design-tokens.css`** | CSS custom properties (`--color-*`, `--space-*`, etc.) imported by the React app |
| **`frontend/src/components/ui/`** | Reusable **Button**, **Input**, **Select**, **Textarea**, **Label**, **Card**, **Alert** (Tailwind + design tokens) |

**Styling:** [Tailwind CSS v4](https://tailwindcss.com/) is wired via `@tailwindcss/vite` in `frontend/vite.config.js`. Utilities use `var(--...)` from `design-tokens.css` where possible.

**View the style guide in the browser:** run `npm run dev` in `frontend`, then open **http://localhost:5173/style-guide.html** (or **http://127.0.0.1:5173/style-guide.html**).

When you change tokens, update `design-tokens.css` and keep the `:root` block in `frontend/public/style-guide.html` aligned (see comment at the top of that file).

### Backend database access (PostgreSQL + SQLAlchemy)

- **Requirements**
  - **Python**: 3.10+
  - **PostgreSQL**: running locally (or accessible remotely)
  - **Tools**: `pip`, `alembic`

- **1. Clone and go to the project**

  ```bash
  cd "c:\Users\YOUR_USER\YourProjectFolder"
  ```

- **2. Install Python dependencies**

  ```bash
  pip install -r requirements.txt
  ```

- **3. Configure the database connection**

  - Create a PostgreSQL database, e.g. `jeal_db`.
  - Set the `DATABASE_URL` environment variable (Windows PowerShell example):

  ```powershell
  $env:DATABASE_URL = "postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db"
  ```

  - If `DATABASE_URL` is not set, the default used is
    `postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db` (see `backend/app/database.py` and `alembic.ini`).

- **4. Create/update the database schema (migrations)**

  From the project root:

  ```bash
  python -m alembic upgrade head
  ```

  On Windows, if `alembic` is not on your `PATH`, use `python -m alembic` as shown above.

  This applies the schema migrations and seeds sample interest categories, interests, clubs, and events for development/testing.

### Default admin account (development)

After migrations reach head, a built-in administrator user is created **if no user with that email exists yet**:

| Field | Value |
|--------|--------|
| **Email** | `admin@admin.com` |
| **Password** | `Admin123!` |

Use these credentials on the app **Login** page. This account has **`is_admin`** set so you can open **`/admin`** (clubs and events management shell).

**Security:** Change or remove this account in any shared or production environment. The password matches the same SHA-256 hashing used by **`POST /login`** in `backend/app/main.py`. The seed is defined in `alembic/versions/seed_admin_user.py`.

- **5. Run the backend API**

  ```bash
  python -m uvicorn backend.app.main:app --reload
  ```

  The API will be available at `http://127.0.0.1:8000`.

- **6. Enter and view data in the database**

  - Open the interactive API docs in a browser: `http://127.0.0.1:8000/docs`.
  - Use endpoints that work with the database (for example, `/users`) to **create**, **list**, **update**, and **delete** records.
  - All changes made through these endpoints are stored in the PostgreSQL database configured in `DATABASE_URL`.

### Backend API overview (current state)

- **Auth & users**
  - **POST** `/register`: create a user with `email` + strong `password` (validated in backend).
  - **POST** `/login`: verify credentials, returns a simple `user_id`.
  - **GET** `/users/{user_id}`: fetch user profile (name, programme, year, faculty, grade_year, age_group, city).
  - **PATCH** `/users/{user_id}`: update profile fields.
  - **GET** `/users`: list all users (mainly for admin/debug).

- **Interests**
  - **GET** `/interest-categories`: list interest categories.
  - **GET** `/interests`: list interests, optional `category_id` filter.
  - **PUT** `/users/{user_id}/interests`: replace a user's interests.
    - Request body:

      ```json
      {
        "items": [
          { "interest_id": "UUID", "level": "high" },
          { "interest_id": "UUID", "level": "medium" }
        ]
      }
      ```

  - **GET** `/users/{user_id}/interests`: returns interests for a user with interest + category info.

- **Clubs & events**
  - **Clubs**
    - **POST** `/clubs`: create a club (linked to `interest_categories` via optional `category_id`).
    - **GET** `/clubs`: list clubs, optional filters `category_id`, `city`.
    - **GET** `/clubs/{club_id}`: single club.
    - **PATCH** `/clubs/{club_id}`: update club details.
    - **DELETE** `/clubs/{club_id}`: delete club.
  - **Events**
    - **POST** `/events`: create event (optional `category_id`, optional `club_id`).
    - **GET** `/events`: list events, filters by `category_id`, `club_id`, `city`.
    - **GET** `/recommendations`: return both recommended clubs and events in one response object.
    - **GET** `/events/{event_id}`: single event.
    - **PATCH** `/events/{event_id}`: update event details.
    - **DELETE** `/events/{event_id}`: delete event.

The seeded development data includes several sample clubs and linked events so these endpoints can be exercised immediately after running migrations.

All of these endpoints are wired to the PostgreSQL database via SQLAlchemy models in `backend/app/models.py` and migrations in `alembic/versions`.
