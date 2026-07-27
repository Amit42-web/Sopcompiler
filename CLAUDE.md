# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## Project

**RuleForge AI** — an enterprise SaaS that converts Standard Operating
Procedure (SOP) documents into executable **Rule Engine JSON**.

This is a monorepo:

- **`/` (root)** — Next.js 15 frontend (App Router, TypeScript, Tailwind, shadcn/ui)
- **`/backend`** — FastAPI service (document parsing + AI pipeline + rule generation)

## Commands

### Frontend (run from repo root)

```bash
npm install            # install dependencies
npm run dev            # dev server → http://localhost:3000
npm run build          # production build (also type-checks + lints)
npm run lint           # ESLint (next/core-web-vitals)
npm run start          # serve the production build
```

There is no separate test runner on the frontend; `npm run build` is the gate —
it must compile with zero type or lint errors.

### Backend (run from `backend/`)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # API → http://localhost:8000 (docs at /docs)
pytest                          # run the test suite (must stay green)
```

## Architecture

```
Next.js frontend  ──HTTP/JSON──▶  FastAPI backend
 src/lib/api.ts                    parse → pipeline → rules → validate → export
```

### The AI pipeline (backend)

A chain of **pure, independently-testable functions** over parsed text. Each
stage lives in its own module under `backend/app/services/`:

```
parse (PDF/DOCX/TXT)   parsing.py          # Sprint 3
  → metadata           metadata.py         # Sprint 6
  → sections           sections.py         # Sprint 4
  → scenarios          scenarios.py        # Sprint 5
  → resolution groups  scenarios.py        # Sprint 5
  → knowledge base     knowledge_base.py   # Sprint 6
  → rules              rules_engine.py     # Sprint 7
  → validate / export  validation.py, export.py   # Sprint 9
```

`pipeline.py` orchestrates the metadata→sections→scenarios→knowledge-base
stages; `rules_engine.py` turns scenarios into rules.

**Key principle:** the pipeline runs entirely on deterministic heuristics with
**no API key required**. `services/llm.py` is an *optional* enhancer that
activates only when `ANTHROPIC_API_KEY` is set, and it degrades back to the
heuristic result on any error (offline, rate limit, parse failure). Never make
the pipeline hard-depend on the LLM.

## Directory layout

```
src/
├── app/
│   ├── (marketing)/          # Public landing page (own layout, no app chrome)
│   └── (dashboard)/          # App shell (sidebar + top bar) wraps these:
│       ├── dashboard/        #   /dashboard
│       ├── projects/         #   /projects  and  /projects/[id]
│       ├── upload/           #   /upload
│       ├── rules/            #   /rules  (Rule Builder)
│       ├── team/             #   /team
│       └── settings/         #   /settings
├── components/
│   ├── layout/               # sidebar, topbar, mobile-nav, dashboard-shell, logo
│   ├── ui/                   # shadcn/ui primitives (button, card, table, tabs, …)
│   ├── files/                # file-manager
│   ├── rules/                # rule-builder
│   └── upload/               # sop-dropzone
└── lib/
    ├── types.ts              # domain types — MUST mirror backend schemas
    ├── api.ts                # typed backend client (NEXT_PUBLIC_API_URL)
    ├── navigation.ts         # single source of truth for nav items
    └── sample-data.ts        # renders the UI when the backend is offline

backend/app/
├── main.py                   # FastAPI app + CORS + router wiring
├── config.py                 # env-based settings
├── models/schemas.py         # Pydantic schemas — MUST mirror src/lib/types.ts
├── api/                      # routers: projects, files, pipeline, rules, users, health
└── services/                 # parsing + pipeline stages + rules + validation + export + storage
```

## Conventions

### Frontend

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
- Prefer a **system font stack** over `next/font/google` (builds must not depend
  on network font fetches).

### Backend

- **Pydantic v2** schemas in `models/schemas.py` are the contract. When you
  change a schema, update the matching TypeScript type in `src/lib/types.ts`.
- Pipeline stages are **pure functions** — no I/O, no globals. Persistence goes
  through `services/storage.py` (an in-memory, database-shaped store).
- New endpoints go in `api/` as an `APIRouter`, then are included in `main.py`
  under the `/api` prefix.
- Every pipeline stage or rules change needs a test in `backend/tests/`.

## Contract to keep in sync

`src/lib/types.ts` (frontend) and `backend/app/models/schemas.py` (backend)
describe the **same** entities: `Project`, `SopFile`, `SopSection`, `Scenario`,
`SopMetadata`, `KnowledgeEntry`, `Rule`/`RuleSet`, `ValidationReport`,
`TeamMember`. Changing one side means changing the other.

## Definition of done

1. Frontend: `npm run build` compiles with no type/lint errors.
2. Backend: `pytest` is green.
3. Frontend and backend schemas stay in sync.
4. The end-to-end flow still works: upload → run pipeline → generate rules →
   validate → export valid Rule Engine JSON.

## Intentionally not implemented (future sprints)

- **Supabase authentication** — scaffolded in Settings UI only.
- **PostgreSQL persistence** — the storage interface is database-shaped but
  backed by an in-memory store.
- Do not wire these up unless the task explicitly asks for them.
