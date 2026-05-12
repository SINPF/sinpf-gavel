# SINPF LCMS

Legal Case Management System for the Solomon Islands National Provident Fund (SINPF). Built to track, manage, and progress legal cases involving employer non-compliance — unpaid contributions, surcharges, and wages record disputes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Better Auth (email OTP) |
| File Storage | MinIO (S3-compatible) |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Animation | Motion (formerly Framer Motion) |
| Email | Resend |
| Icons | Lucide React, Tabler Icons |
| Fonts | DM Sans, DM Mono |

---

## Features

### Authentication
- Email + OTP login (no passwords)
- Session-based auth with Better Auth
- Route protection — all dashboard routes redirect to login if unauthenticated

### Dashboard
- Summary cards showing total cases, active cases, and cases by type (contributions, surcharges, wages record)
- Clickable cards that navigate directly to a pre-filtered case list
- Real-time case count badges

### Employer Registry
- Searchable, paginated employer table
- Register new employers via a slide-in modal form (name, code, phone, email, address)
- Employer codes used throughout the system for quick identification

### Case Management

**Case List**
- Paginated table of all case referrals (25 per page)
- Search by employer name, employer code, or case ID with highlighted matching terms
- Filter by status, case type, employer, and assigned officer
- "My Cases" toggle to show only cases assigned to the current user
- Closed cases hidden by default with a toggle to reveal them
- Filtered case count shown when any filter is active
- Real-time updates via Server-Sent Events — table refreshes automatically when cases change

**Create Case**
- Two-step form (Employer Info → Case Types & Amounts)
- Step 1: Select employer from searchable dropdown, set referral date
- Step 2: Select one or more case types — each expands inline to accept an amount
  - Unpaid Contributions — amount entry
  - Unpaid Surcharges — amount entry
  - Wages Record — amount entry, document upload, or both (three-way toggle)
- Grand total auto-calculated and displayed as a summary banner
- Navigation gates: Next button locked until employer + date are set; Save locked until at least one case type is complete

**Case Detail — tabbed layout**
- Slide-in animation on open
- Header shows employer name, status badge, and case type pills at a glance

- **Overview tab**
  - Interactive stage stepper — click any stage to advance the case
  - Next Actions panel with contextual stage-advance buttons and an Add Note action
  - Financial summary panel (prominent dark card, right-side) showing contributions, surcharges, wages record, and grand total claim
  - Closure details shown when case is closed

- **Documents tab**
  - Documents grouped by workflow stage
  - Upload button available on the current active stage
  - Supports PDF, Excel, and CSV uploads stored in MinIO
  - Per-file download via pre-signed URLs (1-hour expiry)

- **Proceedings tab**
  - Record court proceedings (trial, hearing, mention, consent order, default judgment, enforcement, discontinued)
  - Capture court (High Court / Magistrates Court), hearing date, next date, and outcome notes

- **Activity tab**
  - Chronological audit log of all case events
  - Tracks stage changes, document uploads, notes, and court activity
  - Shows performer name and timestamp for each event

**Case Lifecycle**
- Stages: Registered → Assessment → Demand Issued → Negotiation → Prosecution → Closed
- Close Case form with closure type (prosecution completed, settlement completed, other) and optional reason and notes
- Closed cases are locked — no further stage changes or actions

---

## Data Model

```
employers
└── case_referrals
    ├── case_referral_types   (unpaid_contributions | unpaid_surcharges | wages_record)
    ├── case_attachments      (stage-tagged, stored in MinIO)
    ├── case_activities       (audit log)
    ├── case_proceedings      (court proceedings)
    └── case_closure          (one-to-one, terminal state)
```

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL and MinIO)
- A [Resend](https://resend.com) API key for email OTP

### Setup

```bash
git clone <repository-url>
cd sinpf-lcms
npm install
```

Copy `.env.example` to `.env.local` and fill in the values:

```env
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
RESEND_API_KEY=...
MINIO_ENDPOINT=...
MINIO_PORT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=...
```

Push the database schema:

```bash
npm run db:push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Drizzle schema to the database |
