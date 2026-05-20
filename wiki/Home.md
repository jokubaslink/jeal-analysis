# 🎓 JEAL — Student Activity Finder

> **Find your people. Find your club. Find your next event.**

JEAL is a personalised web app that helps university students discover clubs and events matched to their interests, register for activities, and connect with like-minded peers — all in one place.

---

## 👥 Team

| Name | GitHub |
|------|--------|
| **Jokūbas Linkevičius** | [@jokubaslink](https://github.com/jokubaslink) |
| **Ernestas Vyšniauskas** | — |
| **Agnius Laurinaitis** | — |
| **Lukrecija Slaviniskaitė** | — |

---

## 📖 Wiki pages

| Page | What's inside |
|------|--------------|
| [🏗️ Architecture](Architecture) | System design, tech stack, component diagram, database schema |
| [🚀 Getting Started](Getting-Started) | Prerequisites, installation, running locally |
| [📱 User Guide](User-Guide) | How to use the app — step-by-step with feature descriptions |
| [🔌 API Reference](API-Reference) | All REST endpoints with request / response examples |
| [🧪 Testing](Testing) | Test plan, manual test results, known limitations |

---

## ✨ Key features at a glance

```
📋 Onboarding quiz      → tell us your interests once
🎯 Recommendations      → ranked clubs & events just for you
🏛️ Clubs directory      → scroll-snap feed, join in one tap
📅 Events browser       → filter by category, city, date
🎟️ Registration         → capacity limits + automatic waitlist
📲 QR check-in          → signed tokens, scan to attend
⭐ Feedback             → rate events and club sessions
👀 Similar students     → find peers with shared interests
🔧 Admin panel          → manage clubs, events, attendance
```

---

## 🛠️ Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · Vite · Tailwind CSS v4 |
| Backend | Python 3.10+ · FastAPI · Pydantic v2 |
| Database | PostgreSQL · SQLAlchemy 2.x · Alembic |
| Auth | Bearer UUID token (lightweight prototype auth) |
| QR tokens | HMAC-SHA256 signed, URL-safe base64 |

---

*Repository: **https://github.com/jokubaslink/jeal-analysis***
