# RuleForge AI

Enterprise SaaS that converts **Standard Operating Procedure (SOP) documents**
into **executable Rule Engine JSON**.

This monorepo contains the full application across all nine sprints:

- **`/` (root)** — Next.js 15 frontend (App Router, Tailwind, shadcn/ui)
- **`/backend`** — FastAPI service (parsing + AI pipeline + rule generation)

## Architecture

```
┌─────────────────────────┐        HTTP / JSON         ┌──────────────────────────┐
│  Next.js 15 (frontend)  │  ───────────────────────▶  │   FastAPI (backend)      │
│  App Router · Tailwind  │                            │   parsing + AI pipeline  │
│  Landing · Dashboard    │  ◀───────────────────────  │   rule engine · export   │
└─────────────────────────┘     src/lib/api.ts         └──────────────────────────┘
```

## Sprint map

| Sprint | Scope                                          | Where                                                   |
| ------ | ---------------------------------------------- | ------------------------------------------------------- |
| 1      | Next.js 15 foundation, dashboard, nav, landing | `src/app/(marketing)`, `src/app/(dashboard)`            |
| 2      | Projects, SOP upload UI, file management       | `projects/`, `upload/`, `components/files/`             |
| 3      | Backend, file upload API, PDF/DOCX/TXT parsing | `backend/app/api/files.py`, `services/parsing.py`       |
| 4      | AI pipeline, text extraction, section detection| `backend/services/pipeline.py`, `services/sections.py`  |
| 5      | Scenario extraction, resolution grouping       | `backend/services/scenarios.py`                         |
| 6      | Metadata extraction, knowledge base            | `backend/services/metadata.py`, `knowledge_base.py`     |
| 7      | Rule Engine JSON generation                    | `backend/services/rules_engine.py`                      |
| 8      | Rule Builder UI                                | `src/app/(dashboard)/rules`, `components/rules/`        |
| 9      | Validation, export, user management            | `backend/services/validation.py`, `export.py`, `team/`  |

## Tech Stack

**Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind CSS 3 · shadcn/ui ·
lucide-react
**Backend:** FastAPI · Pydantic v2 · pypdf · python-docx · (optional) Anthropic

## Getting Started

### Frontend

```bash
npm install
cp .env.example .env.local     # point NEXT_PUBLIC_API_URL at the backend
npm run dev                    # http://localhost:3000
```

The UI renders with built-in sample data even when the backend is offline.

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000  (docs at /docs)
pytest                         # run the test suite
```

## The AI pipeline

The backend pipeline is a chain of pure functions over parsed text:

```
parse → metadata → sections → scenarios → resolution groups → knowledge base → rules
```

It runs entirely on **deterministic heuristics** (no API key required). Set
`ANTHROPIC_API_KEY` in `backend/.env` to enable the optional LLM enhancer in
`backend/app/services/llm.py`, which refines scenario extraction — the pipeline
falls back to heuristics automatically if the key or network is unavailable.

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Public landing page
│   │   └── (dashboard)/          # App shell: dashboard, projects, upload,
│   │       │                     #   rules, team, settings
│   │       └── projects/[id]/    # Project detail + file management
│   ├── components/
│   │   ├── layout/               # Sidebar, top bar, mobile nav, shell
│   │   ├── ui/                   # Reusable shadcn/ui primitives
│   │   ├── files/                # File manager
│   │   ├── rules/                # Rule builder
│   │   └── upload/               # SOP dropzone
│   └── lib/                      # types, api client, navigation, sample data
└── backend/
    └── app/
        ├── api/                  # Routers: projects, files, pipeline, rules, team
        ├── models/schemas.py     # Pydantic schemas
        └── services/             # parsing + pipeline + rule engine + validation
```

## Not yet wired (future work)

Authentication (Supabase) and a PostgreSQL persistence layer are scaffolded in
the UI/Settings and the storage interface but intentionally left as in-memory /
placeholder implementations.
```
