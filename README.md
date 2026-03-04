# School Management SaaS — Project Roadmap

> A simple, multi-tenant School Management SaaS for small private schools in Bangladesh.  
> **Stack:** Next.js (App Router) + TypeScript | Express.js + MongoDB | JWT | Vercel + Render/Railway

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [Core Features (MVP Only)](#4-core-features-mvp-only)
5. [Future Features (Phase 2+)](#5-future-features-phase-2)
6. [Technical Architecture Overview](#6-technical-architecture-overview)
7. [Folder Structure](#7-folder-structure)
8. [Database Design Overview](#8-database-design-overview)
9. [API Module Breakdown](#9-api-module-breakdown)
10. [Step-by-Step Development Roadmap](#10-step-by-step-development-roadmap)
11. [Git Commit Strategy](#11-git-commit-strategy)
12. [Development Phases](#12-development-phases)
13. [Suggested Order of Implementation](#13-suggested-order-of-implementation)
14. [SaaS Multi-Tenant Strategy](#14-saas-multi-tenant-strategy)
15. [Subscription-Ready Architecture Planning](#15-subscription-ready-architecture-planning)
16. [Environment Variables](#16-environment-variables)
17. [Deployment Plan Overview](#17-deployment-plan-overview)

### Module quick reference

| # | Module | Objective |
|---|--------|-----------|
| 1 | Project Setup | Two runnable apps (Next.js + Express) and base tooling. |
| 2 | Backend Auth System | Register and login with JWT; school + user creation. |
| 3 | Frontend Auth UI | Login/register pages; token storage; protected routes. |
| 4 | Dashboard Layout and Home | Authenticated dashboard shell and placeholder home. |
| 5 | Student CRUD Backend | Full student API scoped by school_id. |
| 6 | Student Management UI | List, add, edit, delete students in dashboard. |
| 7 | Fee Types and Assignments Backend | Define fee types; assign fees to students. |
| 8 | Fee Payments Backend | Record payments against assignments. |
| 9 | Fee Management UI | Fee types, assignments, and payment UI. |
| 10 | Attendance Backend | Daily attendance API (bulk submit, query). |
| 11 | Attendance UI | Mark and view attendance from dashboard. |
| 12 | Income/Expense Backend | Simple ledger API (income/expense entries). |
| 13 | Income/Expense UI | Add and list income/expense entries. |
| 14 | Dashboard Stats API | Aggregated stats for dashboard cards. |
| 15 | Dashboard Home UI | Real stats and mobile-friendly dashboard home. |
| 16 | User Management Backend | CRUD users within a school (admin). |
| 17 | User Management UI & Settings | Settings page: users and school profile. |
| 18 | Error Handling and Validation | Consistent API errors and validation. |
| 19 | Deployment Preparation | CORS, env config, production readiness. |
| 20 | Deploy to Vercel and Render/Railway | Live frontend and backend. |

---

## 1. Project Overview

| Item | Description |
|------|-------------|
| **Product** | Multi-tenant School Management SaaS |
| **Scope** | Fee management, attendance, simple income/expense tracking |
| **Philosophy** | Operational and clean — not a full ERP; no advanced accounting |
| **Deployment** | Frontend: Vercel \| Backend: Render or Railway \| DB: MongoDB Atlas |
| **Auth** | JWT-based authentication |
| **Tenancy** | Data isolation per school via `school_id` |

---

## 2. Product Vision

- **Primary:** Give small private schools in Bangladesh a single, affordable tool to manage students, fees, attendance, and basic finances.
- **Experience:** Mobile-friendly dashboard, minimal training, clear workflows.
- **Growth path:** Start with MVP (schools, users, students, fees, attendance, simple ledger); later add reports, SMS/notifications, and optional subscription tiers.

---

## 3. Target Users

| Role | Description |
|------|-------------|
| **School Admin** | Owner/principal; manages school profile, staff, and global settings. |
| **Staff / Teacher** | Marks attendance; may have limited access to students and fees. |
| **Accountant / Office** | Fee collection, income/expense entries, basic reports. |
| **Parent** (future) | View child’s attendance and fee status (Phase 2+). |

---

## 4. Core Features (MVP Only)

- **School & tenant management** — Register school, basic profile, `school_id` for all data.
- **Authentication** — Sign up, login, JWT; role per user (admin, staff, accountant).
- **User management** — CRUD users scoped to a school; assign roles.
- **Student management** — CRUD students; link to school; optional class/section.
- **Fee management** — Fee types (e.g. monthly, admission); assign to students; record payments; balance tracking.
- **Attendance** — Daily attendance (present/absent) per student; filter by date, class.
- **Simple income/expense** — Categories; add income/expense entries; school-scoped; no double-entry.
- **Dashboard** — Summary cards (students, fees due, today’s attendance, recent income/expense); mobile-friendly layout.

---

## 5. Future Features (Phase 2+)

- Parent portal (view attendance, fee status, receipts).
- SMS/notification for fee reminders and attendance.
- Reports: fee collection, defaulters, attendance summary, income/expense summary.
- Class/section and academic year; bulk operations.
- Subscription plans and usage-based limits (see [§15](#15-subscription-ready-architecture-planning)).
- Optional: receipts/PDF, basic analytics, multi-branch support.

---

## 6. Technical Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser / Mobile)                      │
│                     Next.js App Router + TypeScript                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Render / Railway)                            │
│                    Express.js + JWT Middleware                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │  Schools │ │ Students │ │   Fees   │ │  Attendance  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────┐                                                    │
│  │ Income / Expense  │                                                    │
│  └──────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Mongoose
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Atlas                                      │
│            (Single cluster; tenant isolation via school_id)               │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Frontend:** Next.js 14+ App Router, TypeScript, server components where useful, client components for forms and interactivity.
- **Backend:** Express.js, Mongoose, JWT in `Authorization: Bearer <token>`, `school_id` on every tenant-scoped request.
- **Multi-tenancy:** Same DB; all tenant-scoped queries filter by `school_id` (and optionally `userId`/role).

---

## 7. Folder Structure

### Frontend (Next.js)

```
frontend/
├── app/
│   ├── (auth)/                    # Auth routes (login, register)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/               # Protected dashboard layout
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard home
│   │   ├── students/
│   │   ├── fees/
│   │   ├── attendance/
│   │   ├── income-expense/
│   │   └── settings/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                        # Reusable UI (buttons, inputs, cards)
│   ├── layout/                   # Header, sidebar, footer
│   ├── forms/                    # Shared form components
│   └── features/                 # Feature-specific (e.g. StudentTable)
├── lib/
│   ├── api.ts                    # API client (fetch wrapper)
│   ├── auth.ts                   # Auth helpers, token storage
│   └── utils.ts
├── hooks/                         # Custom hooks
├── types/                         # Shared TypeScript types
├── public/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Backend (Express)

```
backend/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── auth.js                # JWT verify
│   │   └── tenant.js              # Attach school_id from token/body
│   ├── models/
│   │   ├── User.js
│   │   ├── School.js
│   │   ├── Student.js
│   │   ├── FeeType.js
│   │   ├── FeeAssignment.js
│   │   ├── FeePayment.js
│   │   ├── Attendance.js
│   │   └── IncomeExpense.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── schools.js
│   │   ├── users.js
│   │   ├── students.js
│   │   ├── fees.js
│   │   ├── attendance.js
│   │   └── incomeExpense.js
│   ├── controllers/               # Optional: keep handlers here
│   ├── utils/
│   │   └── errors.js
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── tsconfig.json (if using TS in backend)
```

---

## 8. Database Design Overview

- **Single MongoDB Atlas cluster.** All collections use `school_id` (ObjectId ref to `schools`) for tenant isolation. Index key compound: `(school_id, ...)` for list/filter queries.

### Core Collections

| Collection | Purpose | Key Fields (conceptual) |
|------------|---------|--------------------------|
| **schools** | Tenant; one per school | `name`, `slug`, `contact`, `settings`, `createdAt` |
| **users** | Staff/admins; belong to a school | `school_id`, `email`, `passwordHash`, `role`, `name` |
| **students** | Students per school | `school_id`, `name`, `guardianName`, `class`, `section`, `rollNo`, `status` |
| **feetypes** | Fee definitions (e.g. Monthly, Admission) | `school_id`, `name`, `amount`, `frequency` |
| **feeassignments** | Fee assigned to a student | `school_id`, `student_id`, `feetype_id`, `amount`, `dueDate`, `academicPeriod` |
| **feepayments** | Payment against an assignment | `school_id`, `assignment_id`, `amount`, `paidAt`, `method`, `reference` |
| **attendance** | Daily attendance records | `school_id`, `student_id`, `date`, `status` (present/absent) |
| **incomeexpense** | Simple ledger entries | `school_id`, `type` (income/expense), `category`, `amount`, `date`, `description` |

- **Indexes:** `school_id` (and often `school_id + date`, `school_id + student_id`, etc.) on every tenant-scoped collection.
- **No advanced accounting:** Single-entry style; income and expense are separate document types or a `type` field.

---

## 9. API Module Breakdown

| Module | Base Path | Purpose |
|--------|-----------|--------|
| Auth | `/api/auth` | Register, login, refresh; returns JWT and user/school info. |
| Schools | `/api/schools` | CRUD school (create during signup); get current school. |
| Users | `/api/users` | CRUD users for current school; list by role. |
| Students | `/api/students` | CRUD students; list with filters (class, section, status). |
| Fee types | `/api/fee-types` | CRUD fee types. |
| Fee assignments | `/api/fee-assignments` | Assign fee to student; list by student/class/period. |
| Fee payments | `/api/fee-payments` | Record payment; list by assignment/date range. |
| Attendance | `/api/attendance` | Submit daily attendance; get by date/class/student. |
| Income/Expense | `/api/income-expense` | CRUD entries; list by date range, type, category. |
| Dashboard | `/api/dashboard` | Aggregated stats (counts, due amounts, today’s attendance, recent transactions). |

All tenant-scoped routes must validate JWT and enforce `school_id` from token (or explicit header/param where needed). Use consistent error codes and JSON shape (e.g. `{ success, data?, error? }`).

---

## 10. Step-by-Step Development Roadmap

The roadmap is split into **small modules** (see [§12](#12-development-phases)). Each module is 1–3 days, with a clear objective, backend/frontend/database tasks, and a suggested git commit. Order of implementation is in [§13](#13-suggested-order-of-implementation).

---

## 11. Git Commit Strategy

- **One feature or sub-feature per commit;** avoid large “everything” commits.
- **Commit after each module** (or after each logical sub-task within a module).
- **Message format:** `[Module N] Short description` or `feat(area): description`.
- **Examples:**
  - `[Module 1] Add Next.js and Express projects with base config`
  - `[Module 2] Add JWT auth endpoints and middleware`
  - `feat(students): add student list API with school_id filter`
- Keep commits buildable and runnable so you can bisect or revert easily.

---

## 12. Development Phases

Each phase is a set of modules. Each module is independently buildable and committable (1–3 days).

---

### Phase 1: Foundation

#### Module 1: Project Setup

| Item | Details |
|------|--------|
| **Objective** | Two runnable apps (Next.js + Express) and base tooling. |
| **What to build** | Frontend and backend folders; TypeScript, ESLint, env files; basic scripts. |
| **Backend tasks** | Init Node project; Express server listening on port; health route `GET /health`; `.env.example` with `PORT`, `MONGODB_URI`, `JWT_SECRET`. |
| **Frontend tasks** | Create Next.js app (App Router, TypeScript); add Tailwind; single home page; env for `NEXT_PUBLIC_API_URL`. |
| **Database changes** | None. |
| **Git commit example** | `[Module 1] Add Next.js frontend and Express backend with base config` |

---

#### Module 2: Backend Auth System

| Item | Details |
|------|--------|
| **Objective** | Register and login with JWT; user and school creation in one flow. |
| **What to build** | Auth routes, User and School models, JWT issue/verify, password hashing. |
| **Backend tasks** | Connect MongoDB; create `School` and `User` models; POST register (create school + admin user), POST login; return JWT and user/school; auth middleware to verify JWT and attach `req.user`. |
| **Frontend tasks** | None. |
| **Database changes** | Collections: `schools`, `users`. Indexes: `users.email` (unique per school optional later), `users.school_id`. |
| **Git commit example** | `[Module 2] Add backend auth: register, login, JWT middleware` |

---

#### Module 3: Frontend Auth UI

| Item | Details |
|------|--------|
| **Objective** | Login and register pages; token storage; redirect when authenticated. |
| **What to build** | Login/register forms, API client, auth context or hooks, protected route wrapper. |
| **Frontend tasks** | Pages: login, register; call auth API; store JWT (e.g. localStorage or cookie); auth context; redirect to dashboard if logged in; simple protected layout that redirects to login if no token. |
| **Backend tasks** | None. |
| **Database changes** | None. |
| **Git commit example** | `[Module 3] Add login and register UI with JWT and protected routes` |

---

#### Module 4: Dashboard Layout and Home

| Item | Details |
|------|--------|
| **Objective** | Authenticated dashboard shell and a placeholder home. |
| **What to build** | Dashboard layout (sidebar/nav), header with user/school name, logout; dashboard home page with placeholder content. |
| **Frontend tasks** | Dashboard layout component; sidebar links (placeholder for Students, Fees, Attendance, Income/Expense, Settings); dashboard home page. |
| **Backend tasks** | Optional: GET `/api/auth/me` returning user + school. |
| **Database changes** | None. |
| **Git commit example** | `[Module 4] Add dashboard layout and home page` |

---

### Phase 2: Core Data

#### Module 5: Student CRUD Backend

| Item | Details |
|------|--------|
| **Objective** | Full API for students scoped by `school_id`. |
| **What to build** | Student model, routes: list (with filters), get one, create, update, delete (soft delete optional). |
| **Backend tasks** | `Student` model with `school_id`; CRUD routes; all queries filter by `school_id` from `req.user`. |
| **Frontend tasks** | None. |
| **Database changes** | Collection `students`; index `(school_id, class, section)`, `(school_id, status)`. |
| **Git commit example** | `[Module 5] Add student CRUD API with school_id isolation` |

---

#### Module 6: Student Management UI

| Item | Details |
|------|--------|
| **Objective** | List, add, edit, delete students in the dashboard. |
| **What to build** | Students list page (table/cards), add/edit form, delete confirmation. |
| **Frontend tasks** | Page `/dashboard/students`; table with filters (class, section); create/edit modal or page; delete with confirm; use students API. |
| **Backend tasks** | None. |
| **Database changes** | None. |
| **Git commit example** | `[Module 6] Add student list and CRUD UI` |

---

#### Module 7: Fee Types and Assignments Backend

| Item | Details |
|------|--------|
| **Objective** | Define fee types and assign fees to students. |
| **What to build** | Models: FeeType, FeeAssignment; APIs: fee type CRUD, create/list assignments (by student, class, period). |
| **Backend tasks** | FeeType and FeeAssignment models; routes for fee types and assignments; compute balance (assigned − paid) per assignment. |
| **Frontend tasks** | None. |
| **Database changes** | Collections: `feetypes`, `feeassignments`; indexes including `school_id`, `student_id`, `dueDate`. |
| **Git commit example** | `[Module 7] Add fee types and fee assignment APIs` |

---

#### Module 8: Fee Payments Backend

| Item | Details |
|------|--------|
| **Objective** | Record payments against assignments and support partial payments. |
| **What to build** | FeePayment model; create payment; list payments by assignment or date range. |
| **Backend tasks** | FeePayment model; POST payment (link to assignment, amount, method); update assignment balance; GET payments by assignment or filters. |
| **Frontend tasks** | None. |
| **Database changes** | Collection `feepayments`; index `(school_id, assignment_id)`, `(school_id, paidAt)`. |
| **Git commit example** | `[Module 8] Add fee payment recording API` |

---

#### Module 9: Fee Management UI

| Item | Details |
|------|--------|
| **Objective** | Manage fee types, assign fees, record payments from the dashboard. |
| **What to build** | Fee types CRUD UI; assign fee to student(s); payment form; list assignments with balance; list payments. |
| **Frontend tasks** | Pages: fee types, assignments (by student/class), payments; forms for create payment and assign fee; show balance and due dates. |
| **Backend tasks** | None. |
| **Database changes** | None. |
| **Git commit example** | `[Module 9] Add fee types, assignments, and payment UI` |

---

#### Module 10: Attendance Backend

| Item | Details |
|------|--------|
| **Objective** | Record and retrieve daily attendance per school. |
| **What to build** | Attendance model and API: submit for a date (bulk by class/student), get by date/class/student. |
| **Backend tasks** | Attendance model (school_id, student_id, date, status); POST bulk attendance; GET by date, class, or student. |
| **Frontend tasks** | None. |
| **Database changes** | Collection `attendance`; unique index `(school_id, student_id, date)`; index `(school_id, date)`. |
| **Git commit example** | `[Module 10] Add attendance API with bulk submit and query` |

---

#### Module 11: Attendance UI

| Item | Details |
|------|--------|
| **Objective** | Mark and view attendance from the dashboard. |
| **What to build** | Date picker; class/section filter; student list with present/absent toggle; save; view by date. |
| **Frontend tasks** | Attendance page; load students by class; grid/list with checkboxes; submit to API; optional view-only mode by date. |
| **Backend tasks** | None. |
| **Database changes** | None. |
| **Git commit example** | `[Module 11] Add attendance marking and view UI` |

---

#### Module 12: Income/Expense Backend

| Item | Details |
|------|--------|
| **Objective** | Simple ledger: income and expense entries per school. |
| **What to build** | IncomeExpense model; CRUD; list with filters (date range, type, category). |
| **Backend tasks** | Model with type (income/expense), category, amount, date, description; CRUD routes; list with filters. |
| **Frontend tasks** | None. |
| **Database changes** | Collection `incomeexpense`; indexes `(school_id, date)`, `(school_id, type)`. |
| **Git commit example** | `[Module 12] Add income/expense API and categories` |

---

#### Module 13: Income/Expense UI

| Item | Details |
|------|--------|
| **Objective** | Add and list income/expense entries. |
| **What to build** | Form to add entry (type, category, amount, date); list with filters; simple summary (optional). |
| **Frontend tasks** | Income/expense page; add form; table/list with date range and type filter; optional category dropdown from backend or static list. |
| **Backend tasks** | None. |
| **Database changes** | None. |
| **Git commit example** | `[Module 13] Add income/expense entry UI` |

---

#### Module 14: Dashboard Stats API

| Item | Details |
|------|--------|
| **Objective** | Aggregated data for dashboard cards. |
| **What to build** | Single dashboard endpoint or a few small endpoints: student count, fees due (sum/count), today’s attendance summary, recent income/expense. |
| **Backend tasks** | GET `/api/dashboard/stats` (or similar) returning counts and sums; all scoped by `school_id`. |
| **Frontend tasks** | None. |
| **Database changes** | None (only queries). |
| **Git commit example** | `[Module 14] Add dashboard stats API` |

---

#### Module 15: Dashboard Home UI

| Item | Details |
|------|--------|
| **Objective** | Dashboard home shows real stats and is mobile-friendly. |
| **What to build** | Cards for students, fees due, today’s attendance, recent transactions; link to relevant sections. |
| **Frontend tasks** | Call dashboard API; render cards; responsive layout; loading and error states. |
| **Backend tasks** | None. |
| **Database changes** | None. |
| **Git commit example** | `[Module 15] Add dashboard home with stats and mobile layout` |

---

#### Module 16: User Management Backend

| Item | Details |
|------|--------|
| **Objective** | CRUD for users within a school (admin only). |
| **What to build** | List users, create (invite), update role, deactivate; ensure only school’s users are visible. |
| **Backend tasks** | Users list filtered by `school_id`; create user (same school); update role; soft delete or isActive flag. |
| **Frontend tasks** | None. |
| **Database changes** | Index `users.school_id`; optional unique `(school_id, email)`. |
| **Git commit example** | `[Module 16] Add user management API for school admins` |

---

#### Module 17: User Management UI & Settings

| Item | Details |
|------|--------|
| **Objective** | Settings page: manage users and optionally school profile. |
| **What to build** | User list; add user form; edit role; deactivate; optional school name/contact edit. |
| **Frontend tasks** | Settings section: users tab (list, add, edit role); optional school tab; use user API. |
| **Backend tasks** | Optional: PATCH school profile (name, contact). |
| **Database changes** | None (or school updates). |
| **Git commit example** | `[Module 17] Add user management and settings UI` |

---

### Phase 3: Polish & Deploy

#### Module 18: Error Handling and Validation

| Item | Details |
|------|--------|
| **Objective** | Consistent API errors and request validation. |
| **What to build** | Central error handler; validation (e.g. Joi/Zod) on body/query; frontend error display. |
| **Backend tasks** | Validation middleware for auth, students, fees, attendance, income-expense; 400/401/403/404 responses in same shape. |
| **Frontend tasks** | API client maps non-2xx to errors; show validation messages in forms. |
| **Database changes** | None. |
| **Git commit example** | `[Module 18] Add API validation and unified error handling` |

---

#### Module 19: Deployment Preparation

| Item | Details |
|------|--------|
| **Objective** | Apps ready for Vercel and Render/Railway. |
| **What to build** | Env config, CORS, build scripts, health check. |
| **Backend tasks** | CORS for frontend origin; production env; `NODE_ENV`; health route for platform. |
| **Frontend tasks** | `NEXT_PUBLIC_API_URL` for production; build and start scripts. |
| **Database changes** | None. |
| **Git commit example** | `[Module 19] Add production config and CORS for deployment` |

---

#### Module 20: Deploy to Vercel and Render/Railway

| Item | Details |
|------|--------|
| **Objective** | Live frontend and backend with MongoDB Atlas. |
| **What to build** | Connect repo to Vercel (frontend) and Render/Railway (backend); set env vars; MongoDB Atlas cluster and connection string. |
| **Tasks** | Deploy backend; deploy frontend; set `NEXT_PUBLIC_API_URL` to backend URL; verify login and one flow end-to-end. |
| **Git commit example** | `[Module 20] Document deployment and verify production build` |

---

## 13. Suggested Order of Implementation

Execute modules in numerical order:

1. **Module 1** — Project setup  
2. **Module 2** — Backend auth  
3. **Module 3** — Frontend auth UI  
4. **Module 4** — Dashboard layout and home placeholder  
5. **Module 5** → **Module 6** — Students (backend then frontend)  
6. **Module 7** → **Module 8** → **Module 9** — Fees (types/assignments, payments, then UI)  
7. **Module 10** → **Module 11** — Attendance (backend then frontend)  
8. **Module 12** → **Module 13** — Income/expense (backend then frontend)  
9. **Module 14** → **Module 15** — Dashboard stats and home UI  
10. **Module 16** → **Module 17** — User management (backend then UI/settings)  
11. **Module 18** — Error handling and validation  
12. **Module 19** → **Module 20** — Deployment prep and deploy  

Dependencies: Auth (2, 3) before dashboard (4); dashboard and students before fees/attendance; all core features before dashboard stats (14–15) and user management (16–17).

---

## 14. SaaS Multi-Tenant Strategy

- **Model:** Single database, tenant isolation by `school_id` (shared schema, row-level isolation).
- **How it works:**
  - Every tenant-scoped document has `school_id` (ObjectId ref to `schools`).
  - On login, JWT payload includes `userId` and `schoolId` (and optionally `role`).
  - Backend middleware sets `req.schoolId` from token; every list/create/update/delete filters or sets `school_id`.
- **Security:** Never trust client for `school_id`; always use token (or server-side lookup). Validate that the user belongs to that school.
- **Scalability:** Index all tenant queries on `school_id` first; for very large scale, consider sharding or separate DB per tenant later (out of MVP scope).

---

## 15. Subscription-Ready Architecture Planning

*(Planning only; no implementation in MVP.)*

- **Concepts to reserve in schema:**
  - **Plans:** e.g. `free`, `basic`, `premium` (stored in `schools.plan` or a separate `subscriptions` collection).
  - **Limits:** max students, max users, max branches (stored in config or plan table).
- **Where to enforce:**
  - On create: student, user, etc. — check current usage vs plan limit before inserting.
  - Middleware or route-level checks: e.g. `requireLimit('students')` that reads school plan and count.
- **Billing:** Do not build payment in MVP. Keep a `schools.plan` and `schools.subscriptionStatus` (e.g. active/trial/cancelled) for future Stripe/payment integration.
- **Data model:** Optional `plans` collection (name, limits, price); `schools.planId` or `schools.plan` string; usage counters either computed on demand or cached in `schools` (e.g. `studentCount` updated on add/delete).

---

## 16. Environment Variables

### Backend (`.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Production

- **Backend (Render/Railway):** `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL` (Vercel app URL), `PORT` (if required by platform).
- **Frontend (Vercel):** `NEXT_PUBLIC_API_URL` = backend public URL.

Keep `.env` and `.env.local` out of git; maintain `.env.example` and `.env.local.example` with dummy values and document each variable in this README or a separate env doc.

---

## 17. Deployment Plan Overview

| Step | Action |
|------|--------|
| 1 | Create MongoDB Atlas cluster; get connection string; allow access from Render/Railway and Vercel (or 0.0.0.0/0 for simplicity, then restrict by IP if needed). |
| 2 | Create backend project on Render or Railway; connect repo; set root to `backend` (or `backend/`); set build command `npm install` and start command `npm start`; add env vars. |
| 3 | Get backend URL (e.g. `https://your-api.onrender.com`). |
| 4 | Create Vercel project; connect same repo; set root to `frontend`; set `NEXT_PUBLIC_API_URL` to backend URL. |
| 5 | Deploy; run smoke test: register, login, add student, add fee payment, mark attendance. |
| 6 | Optional: custom domain for frontend and backend; HTTPS is default on both platforms. |

---

## Summary

- **MVP:** Schools, users, students, fee types/assignments/payments, attendance, income/expense, dashboard, and settings — all isolated by `school_id`.
- **Development:** 20 small modules in 3 phases; 1–3 days per module; small git commits.
- **Next steps:** Start with Module 1 (project setup), then proceed in order; after Module 20 you have a deployable MVP. Phase 2 (reports, parent portal, SMS, subscriptions) can follow this same modular approach.

---

*Document version: 1.0 — Project Roadmap*
