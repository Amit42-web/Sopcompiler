# RuleForge AI

Enterprise SaaS that converts **Standard Operating Procedure (SOP) documents**
into **executable Rule Engine JSON** — built as a **single Next.js 15
application** backed by **PostgreSQL**. The UI and the API (document parsing +
AI pipeline + rule generation + persistence) all live in this one app; there is
no separate backend service.

Every uploaded SOP and every artifact it produces (metadata, sections,
scenarios, knowledge base, rules, validation reports) is **permanently stored**.
Nothing resets when a session ends — the dashboard, projects, and SOP library
all read live from the database.

## Architecture

```
Browser ──▶ Next.js App Router (one app)
              ├─ UI            src/app/(marketing) + src/app/(dashboard)
              ├─ API routes    src/app/api/*/route.ts
              ├─ pipeline      src/server/{parsing,sections,scenarios,…}.ts  (pure TS)
              ├─ ingest        src/server/ingest.ts    (runs pipeline + persists)
              ├─ queries       src/server/queries.ts   (paginated reads)
              └─ database      Prisma → PostgreSQL      (prisma/schema.prisma)
```

The frontend calls same-origin API routes through `src/lib/api.ts`.

## Persistence & data model

Normalized PostgreSQL tables (see `prisma/schema.prisma`), accessed through
Prisma:

`User` · `Project` · `SopFile` · `Metadata` · `Section` · `Scenario` ·
`KnowledgeEntry` · `RuleSet` · `Rule` · `ValidationReport` · `ProcessingRun` ·
`Activity`

- **Upload → `POST /api/projects/:id/files`** stores the original SOP text, runs
  the pipeline, persists every intermediate result, generates + validates rules,
  records a `ProcessingRun`, and writes `Activity` entries.
- **Dashboard / library / projects** read straight from the database — the
  pipeline is never re-run to display data.
- List endpoints are **paginated** and compute per-file scenario/rule counts
  with a constant number of queries (no N+1), so a workspace scales to thousands
  of SOPs.

## Quick start

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env             # set DATABASE_URL to your Postgres
npx prisma migrate deploy        # create the tables (or `prisma migrate dev`)
npm run dev                      # http://localhost:3000
```

## Sprint map

| Sprint | Scope                                          | Where                                                     |
| ------ | ---------------------------------------------- | --------------------------------------------------------- |
| 1      | Next.js 15 foundation, dashboard, nav, landing | `src/app/(marketing)`, `src/app/(dashboard)`              |
| 2      | Projects, SOP upload UI, SOP library            | `projects/`, `upload/`, `library/`                        |
| 3      | Upload API + PDF/DOCX/TXT parsing              | `src/app/api/projects/[id]/files`, `src/server/parsing.ts`|
| 4      | AI pipeline, text extraction, section detection| `src/server/pipeline.ts`, `src/server/sections.ts`        |
| 5      | Scenario extraction, resolution grouping       | `src/server/scenarios.ts`                                 |
| 6      | Metadata extraction, knowledge base            | `src/server/metadata.ts`, `src/server/knowledge-base.ts`  |
| 7      | Rule Engine JSON generation                    | `src/server/rules-engine.ts`                              |
| 8      | Rule Builder UI (in Project Details)           | `components/rules/rule-builder`                            |
| 9      | Validation, export, user management            | `src/server/validation.ts`, `export.ts`, `api/team/`      |

## Tech Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 3 · shadcn/ui · lucide-react ·
`unpdf` (PDF) · `mammoth` (DOCX) · optional Anthropic enhancer.

## Getting Started

```bash
npm install
cp .env.example .env.local     # optional: add ANTHROPIC_API_KEY to enable the LLM
npm run dev                    # http://localhost:3000  (API under /api)
```

`npm run build` is the gate: it type-checks and lints. The UI also renders with
built-in sample data if the API returns nothing.

## The AI pipeline

A chain of pure functions over parsed text, one file per stage in `src/server/`:

```
parse → metadata → sections → scenarios → resolution groups → knowledge base → rules
```

It runs entirely on **deterministic heuristics** (no API key required). Set
`ANTHROPIC_API_KEY` to enable the optional enhancer in `src/server/llm.ts`
(called with plain `fetch` — no SDK), which refines scenario extraction and
falls back to heuristics automatically if the key or network is unavailable.

## API

| Method | Path                                   | Purpose                    |
| ------ | -------------------------------------- | -------------------------- |
| GET    | `/api/health`                          | Health + feature flags     |
| GET/POST | `/api/projects`                      | List / create projects     |
| GET    | `/api/projects/{id}`                   | Get a project              |
| GET/POST | `/api/projects/{id}/files`           | List / upload + parse SOP  |
| POST   | `/api/files/{id}/pipeline`             | Run the AI pipeline        |
| GET    | `/api/files/{id}/pipeline`             | Fetch pipeline result      |
| POST   | `/api/projects/{id}/rules`             | Generate a rule set        |
| GET    | `/api/rules/{id}`                      | Get a rule set             |
| POST   | `/api/rules/{id}/validate`             | Validate a rule set        |
| GET    | `/api/rules/{id}/export?format=json`   | Export Rule Engine JSON    |
| GET/POST | `/api/team` · `/api/team/invite`     | List / invite members      |

## Project Structure

```
src/
├── app/
│   ├── (marketing)/          # Public landing page
│   ├── (dashboard)/          # App shell: dashboard, projects, upload, rules, team, settings
│   └── api/                  # Route Handlers (the API)
├── components/               # layout, ui (shadcn), files, rules, upload
├── lib/                      # types, api client, navigation, sample data
└── server/                   # parsing + pipeline + rule engine + validation + store
```

## Not yet wired (future work)

Authentication (Supabase) and a database persistence layer are scaffolded in
the UI/Settings and in `src/server/store.ts` (an in-memory, database-shaped
store) but intentionally left as placeholders.
