# OnTap Dev Documentation

A full-featured documentation management platform built with **Next.js 15**, **Prisma**, **MySQL**, **TipTap editor**, **JWT authentication**, and **PDF export**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TailwindCSS v4, Framer Motion |
| Editor | TipTap v3 with lowlight syntax highlighting |
| Auth | Jose (JWT), bcryptjs, Nodemailer |
| ORM | Prisma 6 + MySQL |
| Validation | Zod v4 + React Hook Form |
| PDF Export | jsPDF + html2canvas |
| Runtime | Node.js 18+ |

---

## Local Development Setup

### Prerequisites
- Node.js >= 18
- Bun >= 1.x  (`npm install -g bun`)
- MySQL database (local XAMPP or remote Hostinger)

### 1. Install dependencies

```bash
bun install
bun pm trust --all
```

### 2. Configure .env

Edit the `.env` file in the project root with real values:

```env
DATABASE_URL="mysql://root:@localhost:3306/chrysalis"
JWT_SECRET="<generate: node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\">"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="you@gmail.com"
SMTP_PASS="your-app-password"
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Gmail App Password**: myaccount.google.com → Security → 2-Step Verification → App Passwords

### 3. Push database schema

```bash
# Simple schema push (no migration history – good for first setup)
bun run db:push

# OR create a tracked migration (recommended for production)
bun run db:migrate
```

### 4. Start dev server

```bash
bun run dev
# → http://localhost:3000
```

Root `/` redirects to `/dashboard` if authenticated, else `/login`.

---

## Project Structure

```
app/
├── api/
│   ├── auth/           # register, login, logout, verify-email, forgot/reset-password, me
│   └── projects/       # CRUD + sections + content blocks
├── components/
│   ├── auth/           # LoginForm, SignupForm, VerifyEmailPage, ForgotPasswordForm
│   ├── documentation/  # CoverPage, TOC, Editor, Toolbar, SectionsPanel, ExportPDF, DocumentationView
│   ├── projects/       # NewProjectModal, ProjectCard
│   ├── ui/             # Input, Button, Select, Modal
│   ├── Dashboard.tsx
│   ├── Mainpage.tsx    # Sidebar layout (Dashboard + Projects tabs)
│   └── Projects.tsx
├── context/
│   └── AuthContext.tsx
├── dashboard/page.tsx
├── login/page.tsx
├── signup/page.tsx
├── verify-email/page.tsx
├── forgot-password/page.tsx
├── projects/[id]/page.tsx
├── globals.css
├── layout.tsx
└── page.tsx            # redirects to /dashboard or /login
lib/
├── auth.ts             # Jose JWT sign/verify/cookie helpers
├── cn.ts               # clsx wrapper
├── mail.ts             # Nodemailer helpers
├── prisma.ts           # PrismaClient singleton
├── utils.ts            # API response helpers (ok, created, badRequest…)
└── validations.ts      # Zod schemas
middleware.ts           # Edge JWT route protection
prisma/schema.prisma    # Database models
types/index.ts          # Shared TypeScript types
```

---

## Authentication Flow

1. **Register** → `POST /api/auth/register` → verification email sent
2. **Verify email** → `GET /api/auth/verify-email?token=...` → account activated
3. **Login** → `POST /api/auth/login` → sets `auth_token` httpOnly cookie (7d)
4. **Protected routes** (`/dashboard`, `/projects/*`) guarded by `middleware.ts`
5. **Forgot password** → `POST /api/auth/forgot-password` → reset email
6. **Reset password** → `POST /api/auth/reset-password` with token

---

## PDF Export

Click **Export PDF** in the documentation toolbar. The export:
- Captures each `.doc-page` element via html2canvas
- Assembles them into a multi-page PDF via jsPDF
- Uses the selected paper size (A4 / Legal / Long)
- Downloads as `<project-title>.pdf`

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Prisma generate + Next.js build |
| `bun run start` | Start production server |
| `bun run db:push` | Push schema to DB (no migration history) |
| `bun run db:migrate` | Create + apply migration |
| `bun run db:generate` | Regenerate Prisma Client |
| `bun run db:studio` | Open Prisma Studio GUI |

---

## Deployment (Vercel + Hostinger MySQL)

1. Run `bun run build` locally to verify no build errors
2. Set all env vars in **Vercel** dashboard → Project → Settings → Environment Variables
3. `DATABASE_URL` must point to your **Hostinger MySQL** host
4. Set `APP_URL` and `NEXT_PUBLIC_APP_URL` to your production domain
5. Deploy: `vercel --prod`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ERR_REQUIRE_ESM` from Prisma on Node 22 | Use Prisma 6: `bun add prisma@^6 @prisma/client@^6` |
| Postinstall blocked by bun | Run `bun pm trust --all` |
| Emails not sending | Use Gmail App Password, not your account password |
| JWT errors in middleware | Ensure `JWT_SECRET` is identical across all environments |
| `P1001` cannot reach database | Check `DATABASE_URL` and that MySQL is running |
| `P2002` unique constraint failed | Email already registered; use login or a different email |
