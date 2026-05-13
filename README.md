# Gavel

Legal Case Management & Registry System for the Solomon Islands National Provident Fund (SINPF). Built to track, manage, and progress legal cases involving employer non-compliance — unpaid contributions, surcharges, and wages record disputes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Runtime | Bun |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Better Auth (email OTP + Microsoft SSO) |
| File Storage | MinIO (local) / Azure Blob Storage (production) |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Animation | Motion (formerly Framer Motion) |
| Email | Azure Communication Services (production) / console log (dev) |
| Icons | Lucide React, Tabler Icons |

---

## Features

### Authentication
- Email + OTP login (no passwords)
- Microsoft SSO via Azure Entra ID (restricted to `@sinpf.org.sb` tenant)
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
  - Financial summary card showing claim amounts, payments recorded, and outstanding balance per case type
  - Record Payment modal — select case type and enter payment details
  - Undo last action button in the Activity tab

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
  - Tracks stage changes, document uploads, notes, payments, and court activity
  - Shows performer name and timestamp for each event
  - Undo last action (payments, notes, stage changes)

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
    ├── case_attachments      (stage-tagged, stored in MinIO / Azure Blob)
    ├── case_activities       (audit log)
    ├── case_proceedings      (court proceedings)
    ├── case_payments         (payment history per case type)
    └── case_closure          (one-to-one, terminal state)
```

---

## Local Development

### Prerequisites
- [Bun](https://bun.sh) 1.x
- [Docker](https://www.docker.com) (for PostgreSQL and MinIO)
- Docker (for PostgreSQL and MinIO)

### Setup

```bash
git clone <repository-url>
cd sinpf-lcms
bun install
```

Start the dev infrastructure (Postgres on port 5434, MinIO on port 9000):

```bash
bun run docker:dev:up
```

Create `.env.local` with the following values:

```env
SUPER_ADMIN_EMAIL=you@sinpf.org.sb
BETTER_AUTH_SECRET=<random string>
BETTER_AUTH_URL=http://localhost:3000

DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lcms-db
DATABASE_URL=postgres://postgres:postgres@localhost:5434/lcms-db

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=lcms-attachments
MINIO_USE_SSL=false

# Optional — Microsoft SSO (leave blank to disable)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

Push the database schema:

```bash
bun run db:push
```

Start the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Staging (local)

Staging runs the fully containerised app (Next.js + Postgres + MinIO + nginx) on your local machine to mirror the production environment before deploying.

Create `.env.staging`:

```env
BETTER_AUTH_SECRET=<random string>
BETTER_AUTH_URL=http://localhost

DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lcms-db

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=lcms-attachments
MINIO_PUBLIC_URL=http://localhost/storage

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

Build the image and start the stack:

```bash
bun run docker:staging:build
```

Open [http://localhost](http://localhost). To restart without rebuilding:

```bash
bun run docker:staging:up
```

Stop the stack:

```bash
bun run docker:staging:down
```

> **Note:** Do not run dev and staging stacks simultaneously — they conflict on shared ports.

---

## File Storage

Storage is abstracted in `lib/storage.ts`. MinIO is used for local and staging environments. Azure Blob Storage is prepared but commented out for production use.

| Environment | Backend | How |
|---|---|---|
| Local dev | MinIO | SDK connects directly to `localhost:9000` |
| Staging | MinIO | nginx proxies `/storage/` → MinIO container |
| Production | Azure Blob Storage | Uncomment Azure branch in `lib/storage.ts`, set `AZURE_STORAGE_ACCOUNT` |

## Email

Email is abstracted in `lib/mailer.ts`. OTP codes are logged to the console in dev and staging. Azure Communication Services (ACS) is prepared but commented out for production use.

| Environment | Backend | How |
|---|---|---|
| Local dev | Console | OTP printed to terminal |
| Staging | Console | OTP printed to container logs |
| Production | Azure Communication Services | Uncomment ACS branch in `lib/mailer.ts`, set `AZURE_ACS_CONNECTION_STRING` |

---

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Drizzle schema to the database |
| `bun run docker:dev:up` | Start dev infrastructure (Postgres + MinIO) |
| `bun run docker:dev:down` | Stop dev infrastructure |
| `bun run docker:staging:up` | Start staging stack |
| `bun run docker:staging:down` | Stop staging stack |
| `bun run docker:staging:build` | Rebuild app image and start staging stack |
