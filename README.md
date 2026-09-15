# EduFlow API

The backend for EduFlow, a multi-tenant LMS and CRM for education centres. It covers students, groups, lessons, attendance, homework, payments, leads and reports, and activates accounts over Telegram.

**Stack:** NestJS 11 · Prisma 7 · PostgreSQL · Telegram bot (Telegraf)

---

## Run it locally

You need Node.js 20+, PostgreSQL 14+, and a bot token from [@BotFather](https://t.me/BotFather).

```bash
npm ci                 # installs and generates the Prisma client
cp .env.example .env   # then fill it in (see Configuration)
npm run db:deploy      # applies database migrations
npm run start:dev
```

| | |
|---|---|
| API | `http://localhost:3001/api` |
| Swagger | `http://localhost:3001/api/docs` (off when `NODE_ENV=production`) |
| Health | `/api/health` (process up) · `/api/health/ready` (database reachable) |

**First run only.** Set `SUPER_ADMIN_PHONE` and `SUPER_ADMIN_PASSWORD` in `.env`, then:

```bash
curl -X POST http://localhost:3001/api/auth/init
```

This creates the platform admin and three default plans. Once an admin exists it refuses to run again.

---

## Configuration

The app will not start if a required variable is missing, if a JWT key is shorter than 32 characters, or if both keys are the same.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | | PostgreSQL connection string |
| `ACCESS_TOKEN_KEY` | yes | | Signs access tokens. 32+ random characters |
| `REFRESH_TOKEN_KEY` | yes | | Signs refresh tokens. Must differ from the access key |
| `ACCESS_TOKEN_TIME` | yes | | Access token lifetime, e.g. `15m` |
| `REFRESH_TOKEN_TIME` | yes | | Refresh token lifetime, e.g. `7d` |
| `TELEGRAM_BOT_TOKEN` | yes | | Bot that delivers codes and passwords |
| `PORT` | | `3001` | HTTP port |
| `NODE_ENV` | | | `production` turns Swagger off |
| `CORS_ORIGINS` | | `http://localhost:5173` | Comma-separated browser origins allowed to call the API |
| `TRUST_PROXY` | | `false` | Set `true` behind nginx so rate limits see real client IPs |
| `APP_TIMEZONE` | | `Asia/Tashkent` | Clock for scheduled jobs |
| `SUPER_ADMIN_PHONE` | for `/auth/init` | | Platform admin phone |
| `SUPER_ADMIN_PASSWORD` | for `/auth/init` | | Platform admin password, 12+ characters |
| `AI_CHAT_ENABLED` | | `false` | Turns on the AI assistant (see below) |
| `GROQ_API_KEY` | if AI is on | | Your Groq API key |
| `GROQ_MODEL` | | `openai/gpt-oss-120b` | Model the assistant uses |
| `AI_MINUTE_LIMIT` / `AI_DAILY_LIMIT` | | `5` / `30` | AI messages each user may send |

Generate a key with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Roles and tenants

A **tenant** is one education centre. Every record belongs to a tenant, and every query is scoped to the caller's tenant. One centre can never read another's data.

| Role | Can |
|---|---|
| `PLATFORM_ADMIN` | Run the platform: all tenants, plans, subscriptions. Has no tenant of their own |
| `MANAGER` | Run one centre, and create admins, teachers and students |
| `ADMIN` | Day-to-day operations, and create teachers and students |
| `TEACHER` | Their own groups, lessons, attendance and homework |
| `STUDENT` | Their own courses, attendance, homework and payments |

Users can only create or manage users below their own role. A platform admin viewing a tenant report passes `?tenantId=`.

---

## Authentication

### How an account becomes usable

1. A manager or admin creates the user with `POST /api/auth/create-user`. The account starts **inactive**, with no usable password.
2. The user opens the Telegram bot and taps **Share Contact**. Only their own number is accepted.
3. They request a code with `POST /api/auth/resend-otp`. If their Telegram was already linked in step 1, the code was sent automatically.
4. They submit the code with `POST /api/auth/verify-activation`. The account activates and **their password arrives in Telegram**. Five wrong codes invalidate it.
5. They log in with `POST /api/auth/login`.

A forgotten password works the same way: `POST /api/auth/forgot-password` with `{ "phone": "..." }` sends a new password to the linked Telegram. The response is identical whether or not the number is registered.

### Tokens

| Token | Lifetime | How to send it |
|---|---|---|
| Access | 15 min | `Authorization: Bearer <accessToken>` on every request |
| Refresh | 7 days | `POST /api/auth/refresh` with body `{ "refreshToken": "..." }` |

Each refresh returns a **new pair**, and the old refresh token stops working. If a refresh returns `401`, send the user to the login screen. Blocking or deleting a user takes effect on their very next request.

### Public routes

Every route needs an access token except these:

`POST /auth/login` · `/auth/refresh` · `/auth/verify-activation` · `/auth/resend-otp` · `/auth/forgot-password` · `/auth/init` · `GET /health` · `/health/ready`

### Rate limits

Limits are per minute. The auth routes count per phone number on each network and per network, so one person guessing a password is stopped without locking out a whole classroom behind one router. Everything else counts per signed-in session (per IP when signed out): 300 a minute. Going over returns `429`.

| Route | Per phone number | Per network (IP) |
|---|---|---|
| `POST /auth/login` | 5 | 100 |
| `POST /auth/verify-activation` | 10 | 60 |
| `POST /auth/resend-otp`, `/auth/forgot-password` | 3 | 30 |
| `POST /auth/init` | | 3 |

---

## API conventions

**Errors** always have this shape. For validation failures, `message` is a list of what is wrong:

```json
{
  "statusCode": 400,
  "message": ["phone must be a phone number, e.g. 998901234567"],
  "error": "Bad Request",
  "timestamp": "2026-09-15T12:13:21.923Z",
  "path": "/api/auth/login"
}
```

**Unknown fields are dropped.** Anything a body or query does not declare is stripped before it reaches the code, so a request cannot set fields it was never meant to, such as `role` or `tenantId`.

**Lists** accept `?page=1&limit=20`. `limit` is capped at 1000 (100 for notifications), and results come back as `{ data, meta: { total, page, lastPage } }`.

**Phone numbers** are accepted in any common format and stored as digits only: `+998 90 123-45-67` becomes `998901234567`.

**Transactions** have `type` `INCOME` or `EXPENSE`, and `status` `PAID`, `PENDING`, `OVERDUE` or `REFUNDED`. Amounts are decimals.

**Files** go to `POST /api/files/upload` as multipart field `file`, or `/upload-multiple` with field `files`. Accepted types are images, PDF, Office documents and `.txt`, up to 10 MB each. The response `url` is served from `/uploads/…`.

---

## Modules

| Area | Base paths |
|---|---|
| Accounts | `/auth` `/users` `/student-profiles` `/teacher-profiles` `/staff-profiles` |
| Organisation | `/tenants` `/branches` `/rooms` `/system-settings` |
| Platform billing | `/subscription-plans` `/tenant-subscriptions` |
| Teaching | `/courses` `/course-levels` `/groups` `/group-schedules` `/enrollments` `/lessons` `/attendance` `/homeworks` `/homework-submissions` |
| CRM | `/leads` `/lead-statuses` `/sms-logs` |
| Finance | `/transactions` `/teacher-settlements` |
| Insight | `/reports` `/notifications` |
| Infrastructure | `/files` `/health` |

Every path sits under `/api`. For request and response details, use **Swagger at `/api/docs`**. It lists all routes, their fields and who may call them, and it lets you try them with your token.

### Scheduled jobs

| When | What |
|---|---|
| Daily, 09:00 (`APP_TIMEZONE`) | Sends a debt reminder to every active student with a negative balance |

---

## Scripts

| Command | Does |
|---|---|
| `npm run start:dev` | Run with reload on change |
| `npm run build` / `npm run start:prod` | Compile to `dist/` / run the compiled app |
| `npm run typecheck` | Type-check without building |
| `npm run lint` · `npm test` | Lint · unit tests |
| `npm run db:migrate` | Create and apply a migration after editing `prisma/schema.prisma` (development) |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:generate` | Regenerate the Prisma client |

---

## Deploying

- Set `NODE_ENV=production`, `TRUST_PROXY=true` behind nginx, and add the frontend's domain to `CORS_ORIGINS`.
- Deploy with `npm ci && npm run build && npm run db:deploy && npm run start:prod`, kept alive by PM2 or systemd. A failed start exits non-zero, so the supervisor will notice and restart it.
- **Run exactly one instance.** The Telegram bot uses long polling, and a second copy makes both fail. The scheduled jobs would also run twice.
- Point your uptime monitor at `/api/health/ready`.
- Uploaded files live in `uploads/` on local disk. Keep that directory on a persistent volume, and back it up with the database.

---

## Project layout

```
src/
  commons/      guards, auth strategies, decorators, env validation, error filter, utils
  <feature>/    controller, service and DTOs per module
  prisma/       PrismaService (credential columns are omitted from every query by default)
prisma/         schema.prisma and migrations
docs/ai-chat/   notes from the original Groq integration
```

---

## AI assistant (optional)

`POST /api/aichat` answers questions using a model hosted by [Groq](https://groq.com). It is **off by default**, and while it is off the route does not exist.

**To turn it on**

1. Sign in at [console.groq.com](https://console.groq.com) and create a key under **API Keys**. Groq has a free tier; your account's exact limits are on its **Limits** page.
2. In `.env`, set `GROQ_API_KEY=<your key>` and `AI_CHAT_ENABLED=true`.
3. Restart the API. It refuses to start if the switch is on but the key is empty.

**How it is protected**

- It needs a login, like every other route.
- Each user gets `AI_MINUTE_LIMIT` messages a minute and `AI_DAILY_LIMIT` a day (5 and 30 by default), so one person cannot use up the free allowance everyone shares. Going over returns `429`. A failed call to Groq does not count.
- The key lives only in `.env`, never in code or in responses. Message text is never logged, only who asked, token counts and timing.
- If Groq is busy, down, or rejects the key or model, users get a clear `503` and the reason goes to the server log.

**Contract.** Send `{ "message": "..." }`, up to 2000 characters. You get back `{ reply, model, tokens, remainingToday }`. `GET /api/aichat/quota` returns `{ remainingToday, dailyLimit }`.

**Models get retired.** The original model, `llama-3.3-70b-versatile`, was shut down in August 2026. If the log says the model was rejected, pick a current one at [console.groq.com/docs/models](https://console.groq.com/docs/models) and set `GROQ_MODEL`.
