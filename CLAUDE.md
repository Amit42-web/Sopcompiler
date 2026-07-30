# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## Project

**RuleForge AI** — an enterprise SaaS that converts Standard Operating
Procedure (SOP) documents into executable **Rule Engine JSON**.

This is a **single Next.js 15 application** (App Router, TypeScript, Tailwind,
shadcn/ui) with **persistent storage via Prisma**. The UI and the API both live
here — the API is implemented as Route Handlers under `src/app/api/*`, the
document-parsing + AI pipeline lives in plain TypeScript under `src/server/*`,
and everything is persisted to the database. There is no separate backend
service.

### Persistence

- **PostgreSQL via Prisma.** `prisma/schema.prisma` uses `provider =
  "postgresql"`. Local dev: `docker compose up -d` starts Postgres matching the
  committed `.env` default (`localhost:5432`). In production (Vercel etc.) set
  `DATABASE_URL` in the platform env — it overrides `.env`.
- The schema is normalized and portable: enum-like fields are validated
  strings and list/JSON fields are stored as JSON strings.
- Normalized tables: User, Project, SopFile, Metadata, Section, Scenario,
  KnowledgeEntry, RuleSet, Rule, ValidationReport, ProcessingRun, Activity.
- `src/server/db.ts` is the Prisma client singleton (cached on `globalThis`).
- `src/server/ingest.ts` is the **only** module that writes pipeline output:
  it parses, runs the pipeline, persists every artifact, records a
  ProcessingRun and Activity entries. Uploads are **deduplicated by content
  hash** so the same SOP is never stored twice.
- `src/server/queries.ts` holds all **paginated** read queries with mappers to
  the client-safe types in `src/lib/types.ts`. Per-page counts avoid N+1.
- `src/server/mailer.ts` sends invitation emails via SMTP (nodemailer) when
  `SMTP_*` env vars are set; otherwise invites are recorded without emailing.
- `predev`/`prestart`/`build` run `prisma migrate deploy`, so tables always
  exist. Secrets go in `.env.local` (git-ignored); `.env` holds only the
  non-secret SQLite default.

## Commands

Run from the repo root:

```bash
npm install            # install dependencies
npm run dev            # dev server → http://localhost:3000
npm run build          # production build (also type-checks + lints)
npm run lint           # ESLint (next/core-web-vitals)
npm run start          # serve the production build
```

There is no separate test runner; `npm run build` is the gate — it must
compile with zero type or lint errors.

## Architecture

```
Browser ──▶ Next.js App Router
              ├─ UI            src/app/(marketing) + src/app/(dashboard)
              ├─ API routes    src/app/api/*/route.ts   (call src/lib/api.ts)
              └─ pipeline       src/server/*.ts          (pure TS, Node runtime)
```

The frontend talks to same-origin API routes via `src/lib/api.ts`
(`NEXT_PUBLIC_API_URL` defaults to empty = same origin).

### The AI pipeline (`src/server/`)

A chain of **pure, independently-testable functions** over parsed text. Each
stage is its own file:

```
parse (PDF/DOCX/TXT)   parsing.ts          # Sprint 3
  → metadata           metadata.ts         # Sprint 6
  → sections           sections.ts         # Sprint 4
  → scenarios          scenarios.ts        # Sprint 5
  → resolution groups  scenarios.ts        # Sprint 5
  → knowledge base     knowledge-base.ts   # Sprint 6
  → structured rules   extraction.ts       # Sprint 7 (decision-tree, categorized)
  → validate / export  validation.ts, export.ts   # Sprint 9
```

`pipeline.ts` orchestrates metadata→sections→scenarios→knowledge-base.
`extraction.ts` turns SOP sections into **structured, Rule Engine–ready rules**:
IF/ELSE decision trees with nested AND/OR conditions kept verbatim, split into
categories (business rule / agent obligation / backend action / metadata
condition), with preconditions, mandatory-vs-conditional obligations,
transcript validation prompts for agent actions only, and de-duplication into
reusable rules bound to each triggering scenario. When `ANTHROPIC_API_KEY` is
set, `llm.extractStructured` performs the full-fidelity extraction with the
same output shape; the heuristic extractor is the fallback.

The pipeline then follows **SOP → Knowledge Graph → Rule Engine**:
`knowledge-graph.ts` turns the extracted rules into a typed graph identifying
scenarios, metadata, decisions, customer communication, system actions, AI
evaluations and responses; `rule-engine.ts` compiles that graph into an
executable **Rule Engine decision tree** by applying explicit architectural
rules (every scenario starts with an applicability check; every metadata check
is Attribute→Condition; Prompts only where metadata is insufficient; one
scenario = one independent branch; no cross-scenario evaluation; every branch
ends in a Response; no duplicate Validate Info; reuse shared Responses). Blocks
are Attribute → Condition → Validate Info / Prompt → Response with YES/NO/NA
routing. When a key is set, `llm.buildRuleEngineTree` builds the tree directly
from the SOP with the knowledge base as its system prompt. The tree is the primary export (JSON
tab / Download Rule JSON). Persistence goes through Prisma
(`src/server/ingest.ts` writes, `src/server/queries.ts` reads).

**Key principle:** the pipeline runs entirely on deterministic heuristics with
**no API key required**. `src/server/llm.ts` is an *optional* enhancer that
activates only when `ANTHROPIC_API_KEY` is set (called via `fetch`, no SDK
dependency), and it degrades back to the heuristic result on any error
(offline, rate limit, parse failure). Never make the pipeline hard-depend on
the LLM.

Parsing uses `unpdf` (PDF), `mammoth` (Word/DOCX) and `exceljs` (Excel/XLSX),
imported dynamically inside `parsing.ts`; CSV/TXT/MD are read as text. Routes
that parse or run the pipeline set `export const runtime = "nodejs"`.

## Directory layout

```
src/
├── app/
│   ├── (marketing)/          # Public landing page (own layout, no app chrome)
│   ├── (dashboard)/          # App shell (sidebar + top bar) wraps these:
│   │   ├── dashboard/        #   /dashboard
│   │   ├── projects/         #   /projects  and  /projects/[id]
│   │   ├── upload/           #   /upload
│   │   ├── rules/            #   /rules  (Rule Builder)
│   │   ├── team/             #   /team
│   │   └── settings/         #   /settings
│   └── api/                  # Route Handlers (the API):
│       ├── health/           #   GET  /api/health
│       ├── projects/         #   GET/POST /api/projects, /[id], /[id]/files, /[id]/rules
│       ├── files/[id]/pipeline/   # GET/POST run the pipeline
│       ├── rules/[id]/       #   GET, /validate, /export
│       └── team/             #   GET /api/team, POST /api/team/invite
├── components/
│   ├── layout/               # sidebar, topbar, mobile-nav, dashboard-shell, logo
│   ├── ui/                   # shadcn/ui primitives (button, card, table, tabs, …)
│   ├── files/                # file-manager
│   ├── rules/                # rule-builder
│   └── upload/               # sop-dropzone
├── lib/
│   ├── types.ts              # domain types (shared by UI + API)
│   ├── api.ts                # typed API client (same-origin fetch)
│   ├── navigation.ts         # single source of truth for nav items
│   └── sample-data.ts        # renders the UI when the API returns nothing
└── server/                   # the API's business logic (see pipeline above)
```

## Conventions

- **App Router only.** Server Components by default; add `"use client"` only
  when a component needs state, effects, or browser APIs.
- **Route groups** `(marketing)` and `(dashboard)` set layout, not URL. The
  dashboard shell lives in `src/app/(dashboard)/layout.tsx`; the root layout is
  just `<html>`/`<body>`.
- **Styling:** Tailwind utility classes + design tokens (HSL CSS variables in
  `src/app/globals.css`). Compose class names with the `cn()` helper from
  `src/lib/utils.ts`. Do not add inline styles or new CSS files.
- **UI primitives** follow shadcn/ui conventions (`components/ui`). Reuse them;
  match their forwardRef + `cn()` + variant patterns when adding new ones.
- **Icons:** `lucide-react` only.
- **Navigation** items come from `src/lib/navigation.ts` — update there, not in
  the sidebar/mobile-nav components.
- **API routes** are thin: validate input, call a `src/server/*` function,
  return `NextResponse.json`. Keep business logic in `src/server`, not in the
  route handler.
- **`src/server` modules are pure** — no I/O beyond `store.ts` and the optional
  `llm.ts` fetch. Each pipeline stage stays independently testable.
- Prefer a **system font stack** over `next/font/google` (builds must not depend
  on network font fetches).
- TypeScript target is **ES2018+** (named regex capture groups are used in the
  pipeline).

## Definition of done

1. `npm run build` compiles with no type/lint errors.
2. The end-to-end flow still works: upload → run pipeline → generate rules →
   validate → export valid Rule Engine JSON.
3. `src/lib/types.ts` stays the single source of truth shared by UI and API.

## Intentionally not implemented (future sprints)

- **Supabase authentication** — scaffolded in Settings/Team UI only; roles are
  assignable but not yet enforced.
- Do not wire this up unless the task explicitly asks for it.
