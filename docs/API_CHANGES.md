# API changes

Changes to the HTTP contract that the web app, or any other client, needs to know about. Newest first.

Frontend paths below are relative to `eduflow-front/src`.

---

## 2026-09-15 — Production hardening

Needs the migration `20260915120000_hardening` (`npm run db:deploy`).

### Must change in the frontend

**1. Transactions: `status1` is now `status`.** This applies to requests and responses. Values are `PAID`, `PENDING`, `OVERDUE` and `REFUNDED`. Unknown fields are stripped, so a request that still sends `status1` is saved with the default, `PAID`.

| File | Lines |
|---|---|
| `app/components/Admin/AdminOverviewEnhanced.tsx` | 368–373 |
| `app/components/SuperAdmin/TenantPaymentsPage.tsx` | ~55, 68, 90, 115, 135, 182–198 |

**2. Calls to routes that don't exist.** All 213 frontend API calls were checked against the backend's OpenAPI spec. These were already broken before this release:

| Frontend calls | Where | Use instead |
|---|---|---|
| `GET /students`, `GET /teachers` | `app/components/Admin/AdminOverview.tsx:42-43` | `GET /users?role=STUDENT` / `?role=TEACHER` |
| `POST /platform/managers` | `app/components/SuperAdmin/ManagersPage.tsx:318` | `POST /auth/create-user` with `{ role: "MANAGER", tenantId, firstName, lastName, phone }` |
| `GET /reports/revenue-analytics` | `app/components/SuperAdmin/RevenueAnalytics.tsx:58` | `GET /reports/platform-revenue-analytics` |
| `PATCH /student-profiles/:id` | `services/studentService.ts:201` | `PUT /student-profiles/:userId` |
| `GET /grades`, `POST /grades/bulk` | `app/components/Teacher/AttendancePage.tsx:49,59` | No grades module exists. Scores live in `/homework-submissions`; presence lives in `/attendance` |

**3. Handle `429 Too Many Requests`.** Nothing handles it today. Limits are per client IP, per minute:

| Route | Limit |
|---|---|
| `POST /auth/login` | 5 |
| `POST /auth/resend-otp`, `/auth/forgot-password`, `/auth/init` | 3 |
| `POST /auth/verify-activation` | 10 |
| `POST /auth/refresh` | 30 |
| Everything else | 120 |

The body is `{ "message": "Too many requests. Please wait a minute and try again.", "statusCode": 429 }`.

**4. Show validation errors correctly.** For a validation failure, `message` is a `string[]`. These pages render `response.data.message` as-is, and should use the array-aware helper in `lib/api.ts` (around line 221):

`app/components/LoginPage.tsx:84` · `app/components/ForgotPasswordPage.tsx:70` · `app/components/shared/ProfilePage.tsx:195, 225` · `app/components/Manager/StaffPage.tsx:104` · `app/components/Manager/AdminsPage.tsx:113`

### Changed behaviour (update UI copy)

- **`POST /auth/create-user`** no longer returns `temporaryPassword`. It returns `{ message, userId, telegramLinked, otpSent }`. No password exists until the user activates.
- **`POST /auth/verify-activation`** sends the user's password to them on Telegram when it succeeds. Tell them to check Telegram. Five wrong codes invalidate the code.
- **`POST /auth/forgot-password`** always returns `200` with the same message, whether or not the number is registered. The fallback text "Ushbu raqam tizimda topilmadi" on `ForgotPasswordPage` is no longer accurate.
- **Access tokens last 15 minutes** (they were 15 hours). The single-flight refresh in `lib/api.ts` already matches the backend: it sends `{ refreshToken }` in the body, and the backend rotates the token on every use. A stale or invalid refresh token gets `401`.
- **Blocked or deleted users** get `401` on their next request, not when their token expires.
- **Editing your own account** (`PATCH /users/me`, or `PATCH /users/:id` with your own id) can no longer set `password`. Use `POST /users/change-password`, which checks the current password.
- **The login response** `user` object now also includes `lastName`.

### Non-breaking

- **Notifications** always use the signed-in user. `userId` in the query, body or path is accepted and ignored.
  - `GET /notifications` returns `{ data, meta: { total, unread, page, lastPage } }`.
  - New: `GET /notifications/unread-count` returns `{ unread }`. Use it in `getUnreadCount` instead of fetching the whole list.
  - `DELETE /notifications/clear-all` works without the `/:userId` suffix.
  - `POST /notifications` is limited to `MANAGER`, `ADMIN` and `TEACHER`, and teachers can only notify students. `link` is now stored.
- **Page size** is capped at 1000 on lists and 100 on notifications. Those are the largest values the app already sends.
- **Tenant reports** (`/reports/tenant-*`, `/enrollments-trends`, `/teacher-performance`, `/leads-metrics`) need `?tenantId=` when called by a `PLATFORM_ADMIN`. Response shapes are unchanged. `recentEnrollments[].student` now contains only `id`, `firstName`, `lastName`, `phone` and `photoUrl`.
- **Files** now require login. `POST /files/upload` returns `{ url, filename, originalName, mimetype, size }`. Accepted types are images, PDF, Office documents and `.txt`, up to 10 MB.
- **User responses** never include `passwordHash` or `hashedRt`.
- **`/aichat`** is parked and returns `404`.

### Security note for the frontend repo

`eduflow-front/.env` contains working phone and password pairs for all five roles, and a repository URL. Move them out of the repository, into a local note or a seed script. The superadmin password in that file is being retired anyway.

### Deployment

The backend allows browser origins listed in `CORS_ORIGINS`. Add the Vercel domain there when it exists.
