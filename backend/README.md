# RuleForge AI — Backend

FastAPI service that parses SOP documents and runs the AI pipeline that turns
them into executable Rule Engine JSON.

## Stack

- **FastAPI** + **Uvicorn**
- **Pydantic v2** schemas (mirror the frontend `src/lib/types.ts`)
- **pypdf** / **python-docx** for document parsing
- Optional **Anthropic** enhancer — the pipeline runs fully on heuristics
  without it

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional: add ANTHROPIC_API_KEY to enable LLM
uvicorn app.main:app --reload # http://localhost:8000  (docs at /docs)
```

## Tests

```bash
pytest
```

## Pipeline (Sprints 3–7)

```
upload ──▶ parse (PDF/DOCX/TXT)         # Sprint 3  services/parsing.py
        ──▶ metadata extraction         # Sprint 6  services/metadata.py
        ──▶ section detection           # Sprint 4  services/sections.py
        ──▶ scenario extraction         # Sprint 5  services/scenarios.py
        ──▶ resolution grouping         # Sprint 5  services/scenarios.py
        ──▶ knowledge base              # Sprint 6  services/knowledge_base.py
        ──▶ rule generation             # Sprint 7  services/rules_engine.py
        ──▶ validation & export         # Sprint 9  services/validation.py, export.py
```

Each stage is a pure function over text/structures, so it is independently
testable and swappable — including replacing the heuristics with the optional
LLM enhancer in `services/llm.py`.

## API

| Method | Path                                   | Purpose                        |
| ------ | -------------------------------------- | ------------------------------ |
| GET    | `/api/health`                          | Health + feature flags         |
| GET    | `/api/projects`                        | List projects                  |
| POST   | `/api/projects`                        | Create a project               |
| GET    | `/api/projects/{id}`                   | Get a project                  |
| GET    | `/api/projects/{id}/files`             | List files                     |
| POST   | `/api/projects/{id}/files`             | Upload + parse an SOP          |
| POST   | `/api/files/{id}/pipeline`             | Run the AI pipeline            |
| GET    | `/api/files/{id}/pipeline`             | Fetch pipeline result          |
| POST   | `/api/projects/{id}/rules`             | Generate a rule set            |
| POST   | `/api/rules/{id}/validate`             | Validate a rule set            |
| GET    | `/api/rules/{id}/export?format=json`   | Export Rule Engine JSON        |
| GET    | `/api/team`                            | List team members              |
| POST   | `/api/team/invite`                     | Invite a member                |

## Notes

Data is held in an in-memory store (`services/storage.py`) so the API runs
with zero external dependencies. The method signatures are database-shaped;
swapping in PostgreSQL is a later sprint.
