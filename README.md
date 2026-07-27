# RuleForge AI

Enterprise SaaS for converting **Standard Operating Procedure (SOP) documents**
into **executable Rule Engine JSON**.

> **Sprint 1 — Frontend Foundation.** This milestone delivers the application
> shell and core pages only. Authentication, database, and AI extraction are
> intentionally **not** implemented yet.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS 3**
- **shadcn/ui** component conventions
- **lucide-react** icons

Planned for later sprints: FastAPI backend, PostgreSQL, Supabase Auth, and AI
rule extraction.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the development server      |
| `npm run build` | Create a production build         |
| `npm run start` | Run the production build          |
| `npm run lint`  | Lint the project with ESLint      |

## Project Structure

```
src/
├── app/                     # App Router routes
│   ├── layout.tsx           # Root layout (wraps pages in the dashboard shell)
│   ├── globals.css          # Tailwind + design tokens
│   ├── page.tsx             # Dashboard (home)
│   ├── upload/page.tsx      # Upload SOP
│   ├── projects/page.tsx    # Projects
│   └── settings/page.tsx    # Settings
├── components/
│   ├── layout/              # Sidebar, top bar, mobile nav, shell
│   ├── ui/                  # Reusable shadcn/ui primitives
│   ├── upload/              # SOP dropzone
│   └── page-header.tsx      # Shared page header
└── lib/
    ├── navigation.ts        # Single source of truth for nav items
    └── utils.ts             # `cn` class-merge helper
```

## Sprint 1 Scope

- [x] Clean Next.js 15 App Router application
- [x] Tailwind CSS configured with design tokens
- [x] Professional dashboard layout (sidebar + top bar shell)
- [x] Responsive navigation (desktop sidebar + mobile drawer)
- [x] Dashboard, Upload SOP, Projects, and Settings pages
- [x] Reusable component library

Out of scope (future sprints): authentication, database, and AI.
