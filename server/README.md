# WLM Server — Faculty Work Load Management API

Express.js + SQLite REST API that backs the React client.

---

## Quick Start

```bash
# 1. Install dependencies
cd server
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 3. Seed database with test users
npm run seed

# 4. Start development server (auto-restarts on changes)
npm run dev

# OR start production server
npm start
```

Server runs on **http://localhost:5000** by default.

## Initial Setup

After starting the server for the first time, **you must seed the database with initial users**:

```bash
npm run seed
```

This creates:
- **Admin user**: ID `admin` / Password `admin@123`
- **Test faculty**: `faculty001` / `faculty002` with password `password123`

After seeding, you can log in with any of these credentials. Check `.env` to customize admin credentials.

---

## API Reference

### Authentication
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/auth/login` | Public | Login (returns JWT) |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| GET  | `/api/auth/me` | Auth | Get current user info |

**Login body:**
```json
{ "employeeId": "admin", "password": "admin@123" }
```
**Response:**
```json
{ "success": true, "token": "<jwt>", "user": { "id": "admin", "role": "admin", "name": "Administrator" } }
```

Use the token in subsequent requests:
```
Authorization: Bearer <token>
```

---

### Faculty
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/faculty` | Auth | List all faculty |
| GET | `/api/faculty/:empId` | Auth | Get single faculty member |
| POST | `/api/faculty` | Admin | Add faculty |
| PUT | `/api/faculty/:empId` | Admin | Update faculty |
| DELETE | `/api/faculty/:empId` | Admin | Delete faculty |

---

### Courses
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses` | Auth | List courses (optional `?program=B.Tech&courseType=Mandatory&year=III`) |
| GET | `/api/courses/:id` | Auth | Get single course |
| POST | `/api/courses` | Admin | Create course |
| PUT | `/api/courses/:id` | Admin | Update course |
| DELETE | `/api/courses/:id` | Admin | Delete course |

---

### Faculty Form Submissions
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/submissions` | Admin | List all submissions (optional `?search=`) |
| GET | `/api/submissions/by-faculty/:empId` | Self/Admin | Get submission for a faculty member |
| POST | `/api/submissions` | Auth | Submit course preferences |
| DELETE | `/api/submissions/:id` | Admin | Delete submission |

**Submit body:**
```json
{ "empId": "675", "prefs": [2, 17, 15, 3, 8] }
```

---

### Workload Assignments
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/workloads` | Auth | List workloads (faculty see own only; admin sees all; optional `?search=&empId=`) |
| GET | `/api/workloads/export/csv` | Admin | Download CSV |
| GET | `/api/workloads/:id` | Auth | Get single entry |
| POST | `/api/workloads` | Admin | Assign workload |
| PUT | `/api/workloads/:id` | Admin | Update workload entry |
| DELETE | `/api/workloads/:id` | Admin | Delete workload entry |

**Assign body:**
```json
{
  "empId": "675",
  "courseId": 2,
  "year": "II",
  "section": "A",
  "manualL": 3,
  "manualT": 0,
  "manualP": 2
}
```

---

### Settings
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/settings/form-status` | Auth | Get form open/closed state |
| PUT | `/api/settings/form-status` | Admin | Toggle form `{ "formEnabled": true }` |

---

### Dashboard Stats
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/stats` | Auth | Overview counts + breakdowns |

---

### Health
```
GET /api/health
```

---

## Project Structure

```
server/
├── .env                   # secrets (git-ignored)
├── .env.example           # template
├── package.json
├── data/
│   └── wlm.db             # SQLite database (auto-created)
└── src/
    ├── index.js           # Express app + server bootstrap
    ├── db.js              # SQLite connection + schema
    ├── seed.js            # Seed script (run once)
    ├── middleware/
    │   ├── auth.js        # JWT auth + role guards
    │   └── errorHandler.js
    ├── utils/
    │   └── jwt.js         # sign / verify helpers
    └── routes/
        ├── auth.js
        ├── faculty.js
        ├── courses.js
        ├── submissions.js
        ├── workloads.js
        ├── settings.js
        └── stats.js
```

---

## Default Credentials

| Role | Employee ID | Password |
|------|-------------|----------|
| Admin | `admin` | `admin@123` |
| Faculty | any valid Emp ID | any string (no password set by default) |

> Change `ADMIN_PASSWORD` in `.env` and implement faculty password hashing before deploying to production.
