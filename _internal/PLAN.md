# modern-e2e-quickstart — Build Plan

> A self-paced, hands-on workshop teaching modern E2E testing with **Cucumber + Playwright**, from beginner to advanced, against a simple but fully-functional reference app. Target audience: total beginners to E2E testing.

---

## How to use this document

This file is the complete build plan for a new project. Open Claude Code in an empty directory and hand it this file:

```
Follow PLAN.md. Build Phase A first. Ask before moving between phases.
```

All decisions below are locked unless stated otherwise. If you find an ambiguity, ask before inventing.

---

## 1. What we're building

Two things in one repo:

1. **A reference web app** — a small, fully-functional master-detail project management tool (Users, Projects, Tasks). The app itself is not the lesson; it exists to give the E2E tests something real to test.
2. **A 12-module workshop** — progressive, self-paced content that teaches E2E testing with Cucumber + Playwright, delivered as tagged commits on a linear `main` branch.

Final workshop state = reference app + complete E2E suite covering every concept in the curriculum.

---

## 2. Locked decisions

| Topic | Decision |
|---|---|
| Package manager | **npm** (not pnpm/yarn) |
| Node | 20 LTS |
| Monorepo | **Nx** |
| Frontend | **React + Vite** |
| Backend | **NestJS** |
| Database | **SQLite via Prisma** |
| Auth | **Simple JWT** (Authorization: Bearer), no refresh tokens |
| API style | **REST** |
| Styling | **Tailwind** |
| Language | **TypeScript** everywhere |
| BDD lib | **`playwright-bdd`** (vitalets) — compiles `.feature` files into Playwright tests |
| Cucumber runner | use playwright-bdd's compiler, NOT `@cucumber/cucumber` runner directly |
| License | **MIT** |
| Repo name | `modern-e2e-quickstart` |
| Workshop delivery | **tagged commits** on linear `main`, not branches per module |
| Exclusions | No CI integration, no visual regression, no accessibility, no Docker, no multi-browser matrix (Chromium only), no native Windows (WSL2 only) — all out of scope for v1 |
| Platform | macOS + Linux first-class; Windows via WSL2, documented in troubleshooting |
| Node enforcement | `.nvmrc` pins `20`; `engines.node: ">=20.0.0 <21.0.0"` in `package.json` |
| Line endings | `.gitattributes` with `* text=auto eol=lf` |
| Lockfile | `package-lock.json` committed; `npm ci` is the documented clean-install |
| Scripts | No bash. All repo scripts are `.mjs` (Node ESM) |

---

## 3. Reference app spec

### 3.1 Entities (Prisma)

```prisma
// apps/api/prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String
  name           String
  role           String    @default("member")  // "admin" | "member"
  ownedProjects  Project[] @relation("ProjectOwner")
  assignedTasks  Task[]    @relation("TaskAssignee")
  createdAt      DateTime  @default(now())
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("ProjectOwner", fields: [ownerId], references: [id])
  tasks       Task[]
  createdAt   DateTime @default(now())
}

model Task {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      String    @default("todo")       // "todo" | "doing" | "done"
  priority    String    @default("medium")     // "low" | "medium" | "high"
  dueDate     DateTime?
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assigneeId  String?
  assignee    User?     @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdAt   DateTime  @default(now())
}
```

### 3.2 Seed data

Two separate seeds — keep them distinct.

**Dev seed** (`apps/api/prisma/seed.ts`): idempotent (wipe + reseed). Runs automatically on every `nx serve api` start via a predev hook. For the developer experience of using the app.

Seed contents:
- **3 users** with known passwords (documented in `docs/cheatsheet.md`):
  - `admin@example.com` / `Admin123!` (role: admin)
  - `alice@example.com` / `Password1!` (role: member)
  - `bob@example.com` / `Password1!` (role: member)
- **4 projects** with varied ownership
- **~15 tasks** spread across projects, statuses, priorities, assignees, due dates (include past-due, no-due-date, unassigned)

**E2E seed** (via `/test/seed/*` endpoints): used exclusively by the E2E suite. All data it creates is prefixed `E2E_` (e.g., `E2E_admin@example.com`, project name `E2E_<scenario-id>_<purpose>`). Tests never touch dev-seed data; dev-seed data is never used by tests. Cleanup is guaranteed in two ways:
1. Primary: `After` hooks delete IDs tracked in the scenario's World.
2. Belt & suspenders: `globalSetup` and `globalTeardown` call `/test/reset`, which does `DELETE FROM * WHERE name/email LIKE 'E2E_%'`. Catches anything abandoned by crashed hooks.

**JWT secret** is pinned via `JWT_SECRET` in `.env` / `.env.example`, stable across reboots and reseeds. Tests' cached `storageState` stays valid across reruns.

### 3.3 REST endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | body `{email, password}` → `{token, user}` |
| POST | `/auth/logout` | JWT | no-op stub (for symmetry) |
| GET | `/auth/me` | JWT | current user |
| GET | `/users` | JWT | list |
| GET | `/users/:id` | JWT | |
| GET | `/projects` | JWT | `?search=&ownerId=` |
| POST | `/projects` | JWT | |
| GET | `/projects/:id` | JWT | |
| PATCH | `/projects/:id` | JWT (owner or admin) | |
| DELETE | `/projects/:id` | JWT (owner or admin) | |
| GET | `/projects/:id/tasks` | JWT | `?status=&assigneeId=` |
| POST | `/projects/:id/tasks` | JWT | |
| GET | `/tasks/:id` | JWT | |
| PATCH | `/tasks/:id` | JWT | |
| DELETE | `/tasks/:id` | JWT | |
| POST | `/test/seed/user` | env-guarded | body `{role, emailPrefix?}` → `{id, email, password, token}`. Created user's email is `E2E_<prefix-or-random>@example.com` |
| POST | `/test/seed/project` | env-guarded | body `{ownerId, name}` → `{id, name, ownerId}`. Name auto-prefixed `E2E_` if missing |
| POST | `/test/seed/task` | env-guarded | body `{projectId, title, ...}` → `{id}`. Title auto-prefixed `E2E_` if missing |
| POST | `/test/reset` | env-guarded | Sweeps all `E2E_%` rows. No body, no return body |

All `/test/*` endpoints are disabled when `NODE_ENV === 'production'` — the route module is not loaded. The test-seam is deliberate and documented (Module 06 teaches why).

Validation via `class-validator`. Errors return `{ statusCode, message, error }` consistently.

### 3.4 Web routes

| Route | Purpose |
|---|---|
| `/login` | Login form |
| `/projects` | Master list: search box, "New Project" button, each item links to detail |
| `/projects/:id` | Detail: project info, task list filterable by status, "Add Task" button |
| `/projects/:id/tasks/:taskId` | Task edit (drawer or page — pick one, be consistent) |
| `/users` | User list |
| `/users/:id` | User profile, shows assigned tasks |
| `/profile` | Current user's profile + logout |

Layout: top nav with links, current user, logout. Redirect unauthenticated users to `/login` (preserve `returnTo`).

### 3.5 Locator strategy (critical — bake in from day one)

Layered priority, in order:

1. **`getByRole(role, { name })`** — for anything with a natural ARIA role and accessible name: buttons, links, headings, checkboxes, radios.
2. **`getByLabel(text)`** — for form fields with a visible label.
3. **`getByText(text)`** — for static content assertions where role doesn't apply.
4. **`getByTestId(id)`** — for structural scaffolding without a natural role: row containers, nav regions, toast containers, empty states, inline errors.
5. **Scope + filter** — for selecting specific items in a list: `getByTestId('projects-list').getByRole('listitem').filter({ hasText: seeded.name })`.

**Test-ID format** (when used): `{page-or-feature}-{component}-{role-or-action}`, kebab-case. No dynamic IDs baked into test-IDs — list rows get stable test-IDs (`projects-list-item`) and are disambiguated by content filter, not `-{id}` suffix.

**What gets a test-ID:**
- List containers: `projects-list`, `tasks-list`, `users-list`
- Row scaffolding: `projects-list-item`, `task-row` (with inner children `task-row-status`, `task-row-priority`, `task-row-assignee`)
- Regions without natural roles: `app-nav-user-menu`, `projects-list-empty-state`, `login-error-message`, `toast-container`

**What does NOT get a test-ID:**
- Form fields with labels (use `getByLabel('Email')`)
- Buttons with visible text (use `getByRole('button', { name: 'Save' })`)
- Links (use `getByRole('link', { name: 'Projects' })`)
- Headings (use `getByRole('heading', { name: 'Projects' })`)

Document the strategy in `docs/cheatsheet.md`. Module 02 teaches the layered priority explicitly — it's the workshop's canonical locator lesson.

---

## 4. Repo scaffold

```
modern-e2e-quickstart/
├── apps/
│   ├── api/                      # NestJS + Prisma + SQLite + JWT
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── projects/
│   │       ├── tasks/
│   │       └── main.ts
│   ├── web/                      # React + Vite + Tailwind
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── api/              # fetch wrappers
│   │       ├── auth/             # context, guards
│   │       └── main.tsx
│   └── web-e2e/                  # playwright-bdd
│       ├── features/
│       │   ├── auth/
│       │   ├── projects/
│       │   └── tasks/
│       ├── steps/
│       ├── pages/                # page objects
│       ├── fixtures/
│       ├── support/
│       │   ├── seed/             # typed seed helper library (composes /test/seed/* endpoints)
│       │   ├── world.ts
│       │   ├── hooks.ts
│       │   ├── env.ts
│       │   └── api-client.ts
│       ├── .auth/                # gitignored storageState files
│       ├── data/
│       ├── playwright.config.ts
│       └── cucumber.config.ts    # playwright-bdd defineConfig
├── modules/                      # workshop content
│   ├── 00-setup/README.md
│   ├── 01-first-feature/README.md
│   ├── 02-page-objects-test-ids/README.md
│   ├── 03-fixtures-hooks-world/README.md
│   ├── 04-tagging-outlines-data-tables/README.md
│   ├── 05-auth-storage-state/README.md
│   ├── 06-api-ui-hybrid/README.md
│   ├── 07-network-mocking-interception/README.md
│   ├── 08-custom-commands/README.md
│   ├── 09-parallel-retries-flake/README.md
│   ├── 10-debugging/README.md
│   ├── 11-reporting/README.md
│   └── 12-env-config-capstone/README.md
├── docs/
│   ├── intro.md
│   ├── participant-workflow.md   # how to use tags, git diff, etc.
│   ├── cheatsheet.md
│   └── troubleshooting.md
├── scripts/
│   ├── modules.manifest.json
│   ├── rebuild-tags.mjs          # regenerates tags from manifest
│   └── module.mjs                # participant workflow: begin, compare, reset, status
├── .env.example
├── .nvmrc                        # 20
├── .gitattributes                # * text=auto eol=lf
├── README.md                     # project-level overview, links to docs/intro.md
├── LICENSE                       # MIT
├── package.json                  # engines.node pinned to >=20.0.0 <21.0.0
├── package-lock.json             # committed
├── nx.json
├── tsconfig.base.json
└── .gitignore                    # includes apps/web-e2e/.auth/
```

---

## 5. E2E scaffold details

### 5.1 `playwright-bdd` setup

- Install: `npm add -D playwright-bdd @playwright/test`
- `cucumber.config.ts` uses playwright-bdd's `defineConfig` to map features → steps
- `playwright.config.ts` uses the generated test dir from playwright-bdd
- Single `npx nx e2e web-e2e` runs everything

### 5.2 Conventions

- **Page objects** extend a `BasePage` with `goto()`, common locators (nav, toast). Row-level POMs where relevant (`projectsListPage.row(name)` returns a scoped locator with its own children).
- **Locators follow the layered strategy in §3.5** (role → label → text → testid → scope+filter). Never CSS classes, never XPath.
- **Fixtures** compose: `authenticatedPage` builds on `page` + `apiClient` + pinned `storageState` per role.
- **Seed helpers** in `support/seed/` are typed functions that compose granular `/test/seed/*` calls. Example: `seedProjectWithTasks({ owner: 'admin', tasks: 3 })` returns `{ project, tasks }` with known IDs, names prefixed `E2E_<scenario-id>_`.
- **World** (Cucumber's scenario context) holds shared state like `currentUser`, `createdProjectIds`, `scenarioId` — NOT DOM state.
- **Hooks** in `support/hooks.ts`: `Before` tag-filtered for role setup, `After` for cleanup (deletes tracked IDs).
- **globalSetup**: seed shared read-only E2E users, log in as each, write `storageState` files to `.auth/` (pinned JWT secret keeps these valid across runs).
- **globalTeardown**: call `/test/reset` sweep — belt & suspenders.
- **Tags**: `@smoke`, `@wip`, `@auth`, `@projects`, `@tasks`, `@module-NN`, `@flaky` (excluded from default run).

---

## 6. Workshop modules

Every `modules/NN-name/README.md` follows this template:

```markdown
# Module NN — <Title>

## What you'll learn
- bullet
- bullet

## Why it matters
(2–3 sentences of real motivation — tie to a pain point)

## Prerequisites
- Completed Module NN-1
- On tag `NN-start`: `git checkout NN-start`

## Walkthrough
(step-by-step, with code blocks, small and incremental)

## Exercise
(the thing the participant does themselves)

## Run it
npx nx e2e web-e2e -- --grep @module-NN

## Compare
git diff NN-complete -- apps/web-e2e

## Cheat sheet
(key API surface introduced this module)

## Next
→ [Module NN+1](../NN+1-name/README.md)
```

### Module curriculum (locked)

| # | Module | `NN-complete` deliverable |
|---|---|---|
| 00 | Setup & app tour | App runs, DB seeds, empty e2e project, one passing smoke test |
| 01 | First feature + step definitions | `login.feature` (2 scenarios), matching step defs, green |
| 02 | Page objects + locator strategy | `LoginPage`, `BasePage`, steps refactored to use POM; teaches layered locator priority (§3.5) |
| 03 | Fixtures, hooks, world | `authenticatedPage` fixture, scenario world, `Before`/`After` hooks |
| 04 | Tagging + scenario outlines + data tables | `@smoke @auth`, outline for login failures, data table for project create |
| 05 | Auth & storage state | `storageState` per role, login-once-per-worker, `@anonymous` escape hatch |
| 06 | API + UI hybrid | `apiClient` fixture, seed via API in `Before`, assert via UI, cleanup in `After` |
| 07 | Network mocking & interception | `page.route` stubs for slow/failed responses, offline scenario, HAR recording demo |
| 08 | Custom commands / step composition | Composite steps like `Given I am logged in as {role}`, POM vs step-helper guidance |
| 09 | Parallel, sharding, retries, flake | `fullyParallel`, worker isolation, retries. Flake demo: a `features/flaky.feature` (tagged `@flaky`, excluded from default run) that violates §3.2 isolation — un-prefixed shared name, no cleanup. Reproduce with `--repeat-each 5 --grep @flaky`. Fix by applying the `E2E_<scenario-id>_` prefix pattern |
| 10 | Debugging | UI mode, trace viewer, `test.step()`, `page.pause()`, codegen |
| 11 | Reporting | Playwright HTML, Cucumber JSON output, optional Allure |
| 12 | Env config + capstone | `.env.local` / `.env.ci`, base URL selection; capstone: participant writes a feature solo |

---

## 7. Tag strategy

Linear `main`, tagged commits:
```
00-setup → 01-start → 01-complete → 02-start → 02-complete → ... → 12-complete
```

Rules:
- `NN-start` = previous module's `NN-1-complete` + a commit that adds the module's README AND removes the code the participant will write
- `NN-complete` = `NN-start` + commits that implement the module's exercise/walkthrough
- Participants: `git checkout NN-start` → follow README → `git diff NN-complete` to check

`scripts/modules.manifest.json` maps tags to commit SHAs. `scripts/rebuild-tags.mjs` regenerates all tags from the manifest (no bash — Node for cross-platform consistency, WSL included).

### Participant workflow (locked)

`scripts/module.mjs` wraps the git mechanics participants hit every module. `package.json` exposes them as npm scripts:

```
npm run module:begin 03     # checkout 03-start, create my/03 branch
npm run module:compare 03   # git diff my/03..03-complete -- apps/web-e2e
npm run module:reset 03     # hard-reset my/03 to 03-start (recovery)
npm run module:status       # show current module + branch + dirty state
```

Scripts are thin, readable wrappers — `docs/participant-workflow.md` teaches both the npm commands and the underlying git commands they invoke, so participants understand the mechanics.

---

## 8. Build phases

Do these in order.

**Gate policy:** Phase A → B.1 and B.1 → B.2 transitions are **open** — proceed autonomously. Rationale: Phase B.1's vertical slice is the automated equivalent of the manual smoke script, so passing B.1 green proves Phase A. B.2 is additive and each feature is independently verifiable.

The **Phase B.2 → Phase C gate is closed** — stop and ask before beginning Phase C. Rationale: Phase C rewrites commit history and designs pedagogical commit boundaries, which is a teaching judgment call requiring human review.

The **Phase C → Phase D gate is closed** — stop and ask. Phase D requires a human to dry-run the workshop as a participant.

**Hard blockers:** If Step 0 of Phase A (the ESM/CJS spike) fails or reveals incompatibilities between locked versions, stop and flag rather than improvise. Any deviation from §2 locked decisions is a hard blocker.

### Phase A — Finished reference app (do this first, most of the work)

1. Create Nx workspace, install all deps. **Step 0**: before scaffolding apps, verify the ESM/CJS split (CJS for api, ESM for web/web-e2e) works with the exact Nx + NestJS + Prisma versions you pinned. Spike a "hello world" endpoint before committing to full api scope.
2. Prisma schema + migrations + dev seed + predev hook
3. NestJS API: auth module, JWT guard (secret pinned via `JWT_SECRET`), users/projects/tasks modules, validation, consistent error shape
4. NestJS `/test/*` module (env-guarded): `/test/seed/user`, `/test/seed/project`, `/test/seed/task`, `/test/reset` (§3.3)
5. React app: Tailwind setup, router, auth context, all pages and forms
6. Wire locators per §3.5 (accessible labels first; test-IDs for structural elements)
7. Walk the manual smoke script below end-to-end
8. Commit as tag `reference-complete` (internal milestone — not a module tag)

**Manual smoke script (Phase A exit gate):**
1. `npx nx serve api` starts cleanly; dev seed creates 3 users + 4 projects + ~15 tasks; no errors.
2. `npx nx serve web` starts; no console errors.
3. Hit `/projects` anonymous → redirects to `/login?returnTo=/projects`.
4. Log in as `admin@example.com / Admin123!` → lands on `/projects`, 4 projects visible.
5. Search filters the list.
6. "New Project" → create "Smoke Project" → appears in list.
7. Click into project → detail page, no tasks.
8. "Add Task" → create task with title, priority, due date, assignee → appears.
9. Change task status → list reflects. Filter by status → works.
10. Edit task title → saves. Delete task → gone.
11. Delete project → returns to list, project gone.
12. Log out → back to `/login`.
13. Log in as `alice` → cannot delete admin-owned project (button hidden or 403).
14. `/users`, `/users/:id`, `/profile` render correctly for both roles.
15. Browser console clean across the whole flow.

**Exit criteria for Phase A:** manual smoke script passes; dev seed is idempotent; `POST /test/reset` succeeds; browser console clean.

### Phase B — Reference E2E suite (the "Module 12 complete" state)

Split into two sub-phases:

**Phase B.1 — Vertical slice (~¼ of final scope).** Prove the architecture end-to-end before filling out the suite:

1. Scaffold `apps/web-e2e` with playwright-bdd
2. Write `BasePage` + `LoginPage` + one or two other POMs
3. Write the `authenticatedPage` fixture + the typed seed helper library (`support/seed/`)
4. Write `support/` (world, hooks, env, api-client) and `globalSetup` / `globalTeardown`
5. Write one automated smoke test (plain `test(...)`, not BDD): navigates `/login`, logs in as admin, asserts `/projects`
6. Write representative `.feature`s covering: (a) a login scenario with POM, (b) a project CRUD flow using seed helpers + apiClient + UI assertion, (c) one network-mocked scenario
7. Prove `fullyParallel: true` with 4+ workers, `E2E_` prefix isolation works, storageState per role works

**Phase B.1 exit:** the smoke test + representative features run green twice in a row. Architecture is proven.

**Phase B.2 — Fill out in curriculum order.** Walk modules 1 → 12, add each module's scope in teaching order:

1. For each module, add the scenarios + POMs + fixtures that module introduces
2. Commits roughly align with module boundaries from day one — track a running `scripts/modules.manifest.json` as you go
3. Do not reach for future-module features early (no `storageState` in Module 01-scope commits, etc.)
4. Every module's concept must be demonstrated somewhere in the suite

**Exit criteria for Phase B:** `npx nx e2e web-e2e` runs green, twice in a row, in under **120 seconds** (target: 90).

### Phase C — Module content + tagging

Because Phase B.2 built in curriculum order, Phase C is lightweight:

1. Write all 12 `modules/NN-name/README.md` files based on the reference suite
2. Audit the running manifest — split/merge commits only where a module needs cleaner boundaries; no wholesale rewrite
3. Finalize `scripts/modules.manifest.json` and `scripts/rebuild-tags.mjs`
4. Tag `NN-start` / `NN-complete` for all modules
5. Test participant workflow: `npm run module:begin 03` → edit → `npm run module:compare 03` works

**Exit criteria for Phase C:** `git checkout 00-setup` works; every tag checks out a coherent state; participant workflow scripts work.

### Phase D — Polish + dry run

1. Write `docs/intro.md`, `docs/participant-workflow.md`, `docs/cheatsheet.md`, `docs/troubleshooting.md`
2. Write project `README.md` with quick start + link to `docs/intro.md`
3. Dry-run all 12 modules as a participant (fresh clone, checkout tags, follow READMEs)
4. Log friction, fix, re-tag
5. Second dry run, clean

**Exit criteria for Phase D:** a smart beginner could complete the workshop with no outside help.

---

## 9. Coding conventions

- **No premature abstractions.** Three similar lines is fine; helper when it repeats a fourth time.
- **No comments describing what code does.** Locators, good names, and test-IDs carry the meaning.
- **Locator strategy per §3.5** — layered role → label → text → testid → scope+filter. Test-IDs kebab-case, no dynamic IDs baked in.
- **Error handling** only at system boundaries (HTTP input, external APIs). Trust internal code.
- **File naming**: kebab-case for components/modules, PascalCase for page-object classes.
- **Imports**: absolute paths via `tsconfig.base.json` `paths` when crossing `apps/`.
- **Module system**: ESM in `apps/web` and `apps/web-e2e`. CJS in `apps/api` (Nx + NestJS default). No bash scripts — all repo scripts are `.mjs`.
- **No `libs/` for v1.** Each app defines its own types locally. Revisit if and when duplication becomes painful.

---

## 10. First actions for Claude Code

When you start:

1. Confirm the target directory is empty (or only contains this `PLAN.md` and `CLAUDE.md`)
2. Read `PLAN.md` and `CLAUDE.md` top to bottom
3. Propose a concrete starting step (probably: scaffold Nx workspace + initial commit) and ask to proceed
4. Don't run `npx create-nx-workspace` in a non-empty directory without checking
5. Track progress with TaskCreate/TaskUpdate — one task per phase, subtasks as needed

## 10a. Model selection for subagents

When spawning subagents via the `Agent` tool for code generation, file exploration, or research tasks, **pass `model: "sonnet"`** unless the task specifically requires Opus-level reasoning (architectural design calls, ambiguous spec resolution). Default to Sonnet for:

- Scaffolding files (Nx generators, boilerplate)
- Writing page objects, step definitions, fixtures
- Writing seed data, DTOs, validation schemas
- Writing module README content from a given outline
- Codebase exploration (`Explore` subagent)
- Any task where the approach is already decided and execution is mechanical

Opus stays the parent/orchestrator. Document this rule in `CLAUDE.md` so it survives across sessions.

---

## 11. Open items to revisit later (not blocking)

- GitHub org / publishing
- Whether to add a `solutions/` alternative for participants who don't want to use git tags
- Optional bonus modules (CI, visual, a11y, Docker) once v1 is shipped
- Video walkthroughs

---

*End of plan.*
