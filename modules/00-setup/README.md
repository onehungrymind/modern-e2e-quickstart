# Module 00 — Setup & app tour

## What you'll learn

- How to clone and run the reference app (api + web)
- How the reference app is organized (Nx workspace, two apps)
- What `nx serve`, `nx build`, `nx e2e` do
- How to log in and navigate the app as each role
- Where the E2E scaffold *will* live (empty at module 00)

## Why it matters

You can't write E2E tests for an app you don't understand. Ten minutes clicking through the real UI now will save you three hours of "why is my test failing" later. This module is the only one without any test code — treat it like a warm-up.

## Prerequisites

- macOS, Linux, or Windows-via-WSL2
- Node 20 LTS via `nvm` (or a Node version manager of your choice)
- Git
- A browser (Chrome/Chromium recommended — that's what the suite drives)

## Walkthrough

### 1. Clone and install

```bash
git clone <this-repo>
cd modern-e2e-quickstart
nvm use 20                       # matches .nvmrc
npm ci
```

### 2. Start the app

```bash
npm start
```

This runs both apps in parallel:
- **API** on http://localhost:3000 (NestJS, JWT auth, SQLite via Prisma)
- **Web** on http://localhost:4200 (React + Vite)

On first boot, the API reseeds its SQLite DB with 3 dev users, 4 projects, and ~15 tasks. You should see NestJS logs ending with `API listening on http://localhost:3000` and Vite's `Local: http://localhost:4200/`.

### 3. Tour the app

Open http://localhost:4200. Log in as admin:

- Email: `admin@example.com`
- Password: `Admin123!`

Poke around:

- **Projects list** (`/projects`) — search, "New project" button
- **Project detail** — tasks list with status filter, add/edit/delete tasks
- **Users** (`/users`) — list, detail with assigned tasks
- **Profile** (`/profile`) — current user + role + logout

Now log out and log in as alice (`alice@example.com` / `Password1!`). Notice that on a project she doesn't own (like *Apollo Launch*), the "Delete project" button is hidden. That's an ownership rule we'll test in Module 06.

### 4. Install Playwright browsers

```bash
npx playwright install chromium
```

One-time. Downloads ~150MB of headless Chromium. Skip this and the suite will tell you to install on first run.

### 5. Run the reference suite (optional, for context)

This module's `complete` state has an empty E2E scaffold. To see what the finished suite looks like, check out `12-complete`:

```bash
git stash
git checkout 12-complete
npm run e2e
# 49 scenarios, ~20s
git checkout -   # back to where you were
```

Don't worry about understanding the output yet — Modules 01-12 build it up piece by piece.

### 6. Where the E2E project *will* be

Look at `apps/web-e2e/`:

```
apps/web-e2e/
├── project.json           Nx project config
├── playwright.config.ts   bootstrap (empty-ish at module 00)
└── src/
    └── smoke.spec.ts      one plain Playwright test proving the app loads
```

That's it. No features, no step defs, no POMs. You'll build all of that.

Run the smoke test:

```bash
npm run e2e
# 1 passed
```

This isn't a BDD test — it's a plain `test('app loads and login works', ...)`. Its job is to prove the webServer config boots both the api and web correctly. You won't touch it again after this module.

## Exercise

1. Log in as `bob@example.com` / `Password1!`. Try to delete the *Apollo Launch* project. What happens, and why?
2. With admin logged in, create a new project called "My Scratch Project". Add a task with a due date, a priority, and no assignee. Change its status. Delete it. Delete the project.
3. Run `npm run db:reset` and then refresh http://localhost:4200. What changed? What didn't?

No code to write. Just familiarize yourself.

## Run it

```bash
npm run e2e
```

Expect: `1 passed` (the smoke test).

## Compare

```bash
git diff 00-complete -- apps/web-e2e
```

Nothing meaningful should differ at this stage — the module is setup only.

## Cheat sheet

| Command | What it does |
|---|---|
| `npm start` | Boots api + web in parallel |
| `npm run serve:api` | Just the api |
| `npm run serve:web` | Just the web |
| `npm run e2e` | Runs the E2E suite (bddgen + Playwright) |
| `npm run e2e:ui` | Playwright's interactive UI mode |
| `npm run db:reset` | Wipe + reseed the dev database |
| `npm run graph` | Open Nx's project graph viewer |

Dev seed users (DO NOT mutate in tests — see Module 06):

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | admin |
| `alice@example.com` | `Password1!` | member |
| `bob@example.com` | `Password1!` | member |

## Next

→ [Module 01 — First feature + step definitions](../01-first-feature/README.md)
