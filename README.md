# modern-e2e-quickstart

A self-paced, hands-on workshop that teaches modern end-to-end testing with **Cucumber + Playwright** against a real, fully-functional reference app. You write features, step definitions, page objects, and fixtures — and watch a real browser drive a real full-stack app.

**Target audience:** developers new to E2E testing, or comfortable with Playwright but new to BDD and modern patterns like API-seeded data, storage state, and parallel isolation.

---

## What's in the repo

- **`apps/api/`** — a NestJS REST API (users, projects, tasks, JWT auth) backed by SQLite via Prisma. Seeds itself with dev users on boot. Exposes an env-guarded `/test/*` seam for fast E2E fixture creation.
- **`apps/web/`** — a React + Vite + Tailwind app. Master-detail project management UI (projects list → detail with inline task CRUD, users list + detail, login/profile).
- **`apps/web-e2e/`** — the E2E project. Built with [`playwright-bdd`](https://vitalets.github.io/playwright-bdd/), which compiles Gherkin `.feature` files into Playwright tests. 53 scenarios, parallel-safe, finishes in ~30s.
- **`modules/`** — the workshop itself. 12 modules, each a focused README that walks you from empty E2E suite to full reference suite.
- **`docs/concepts.md`** — high-level reference of every pattern used in the suite, with links to where each pattern lives in the code.

---

## Quick start

> **New to git or E2E testing?** Read the gentle, step-by-step **[participant workflow guide](docs/participant-workflow.md)** first. It walks through your first module from "I just cloned the repo" to "my tests are green," with no assumed git knowledge.

### One-time setup

```bash
# 1. Install Node 20 (matches .nvmrc)
nvm install 20 && nvm use 20

# 2. Install dependencies
npm ci

# 3. Install Playwright browsers (one-time, ~150MB)
npx playwright install chromium
```

You're already on `main`. The tip of `main` is the **opinionated reference**: the complete app + the complete E2E suite, post-curriculum polish included. Tag **`12-complete`** marks the canonical "workshop graduate" state — that's what your work should resemble when you finish the modules. Tags `00-setup` through `12-complete` are the 25 checkpoints between "starting point" and "graduate."

To start the workshop, run `npm run module:begin 00`. The script handles the git mechanics for you.

### Verify your environment

```bash
npm start
```

Boots the API on http://localhost:3000 and the web app on http://localhost:4200. Open http://localhost:4200 and sign in:

| Email                 | Password     | Role   |
|-----------------------|--------------|--------|
| `admin@example.com`   | `Admin123!`  | admin  |
| `alice@example.com`   | `Password1!` | member |
| `bob@example.com`     | `Password1!` | member |

If you can log in and see the projects list, you're ready. `Ctrl+C` stops the servers.

### Useful scripts

- `npm run e2e` — run the E2E suite (auto-boots api + web)
- `npm run e2e:smoke` — quick sanity subset
- `npm run e2e:auth` / `:projects` / `:tasks` / `:users` — single feature area
- `npm run e2e:ui` — Playwright's interactive UI mode
- `npm run e2e:headed` — watch the tests drive a visible browser
- `npm run e2e:report` — open the HTML report from the last run
- `npm run e2e:flaky` — reproduce the deliberate flake demo (Module 09)
- `npm run db:reset` — wipe + reseed the dev database

---

## How the workshop works

**13 modules** numbered `00` through `12`. Each module is a 30–60 minute focused chunk. Module 00 is environment setup (no code). Modules 01–12 each have you write a small piece of the test suite.

Each module has two **git tags** (think: named bookmarks):

- **`NN-start`** — the state you begin in. The reference app is fully working; the test code you're about to write is missing.
- **`NN-complete`** — the canonical answer key. Compare against this when you're done.

Per-module loop:

```bash
# 1. Begin the module — drops you into a fresh `my/03` branch from 03-start
npm run module:begin 03

# 2. Read modules/03-fixtures-hooks-world/README.md and follow the walkthrough.
#    Run your tests as you go:
npm run e2e -- --grep @module-03

# 3. When green, see how the canonical answer compares:
npm run module:compare 03

# 4. Move to the next module. Your `my/03` branch stays — come back any time.
npm run module:begin 04
```

Other useful commands:

- `npm run module:status` — where am I right now?
- `npm run module:reset 03` — discard my work on this module, start over

The `module:*` scripts are thin wrappers around git. You can do the same with raw git if you prefer — see the **[participant workflow guide](docs/participant-workflow.md)** for equivalents and recovery recipes.

---

## Module curriculum

| # | Module | What you build |
|---|---|---|
| [00](modules/00-setup/README.md) | Setup & app tour | Verify the environment, explore the app |
| [01](modules/01-first-feature/README.md) | First feature + step defs | `login.feature` — 2 scenarios, green |
| [02](modules/02-page-objects-locator-strategy/README.md) | Page objects + locator strategy | `LoginPage`, `BasePage`, refactor steps to POM |
| [03](modules/03-fixtures-hooks-world/README.md) | Fixtures, hooks, world | `scenarioWorld`, `seedUser` fixture, cleanup |
| [04](modules/04-tagging-outlines-data-tables/README.md) | Tagging, outlines, data tables | `@smoke`, `Scenario Outline`, `| title | status |` |
| [05](modules/05-auth-storage-state/README.md) | Auth & storage state | `storageState` per role, login-once-per-worker |
| [06](modules/06-api-ui-hybrid/README.md) | API + UI hybrid | Seed data via `/test/seed/*`, assert via UI |
| [07](modules/07-network-mocking-interception/README.md) | Network mocking | `page.route` stubs: slow, error, offline |
| [08](modules/08-custom-commands/README.md) | Custom commands / step composition | `Given I am logged in as {role}` |
| [09](modules/09-parallel-retries-flake/README.md) | Parallel, retries, flake | `fullyParallel`, `--repeat-each`, the `@flaky` demo |
| [10](modules/10-debugging/README.md) | Debugging | UI mode, trace viewer, `test.step()`, `page.pause()` |
| [11](modules/11-reporting/README.md) | Reporting | HTML report, cucumber JSON, optional Allure |
| [12](modules/12-env-config-capstone/README.md) | Env config + capstone | `.env`/config, write a feature solo |

Total time: a focused pass through all 12 modules takes **6–10 hours**. Do it over a couple of evenings or a weekend.

---

## Concepts reference

If you want the "why behind the patterns" without following the modules linearly:

→ **[`docs/concepts.md`](docs/concepts.md)** — every pattern in the suite, with pointers to the actual files.

---

## Stack

| Layer | Pick |
|---|---|
| Monorepo | Nx 22 |
| Node | 20 LTS (pinned via `.nvmrc` + `engines`) |
| API | NestJS 11 + Prisma 6 + SQLite + JWT + class-validator |
| Web | React 19 + Vite + Tailwind v4 + react-router |
| E2E | `@playwright/test` + `playwright-bdd` (compiles `.feature` → Playwright tests) |
| Browser | Chromium only (multi-browser matrix is out of scope for v1) |
| Platform | macOS + Linux first-class; Windows via WSL2 |

Build-time scaffolding (`PLAN.md`, etc.) lives under [`_internal/`](_internal/) — it's preserved for the curious, not for users.

---

## License

MIT. See [LICENSE](LICENSE).
