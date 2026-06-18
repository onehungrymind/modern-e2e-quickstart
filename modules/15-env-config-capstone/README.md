# Module 15 — Env config + capstone

## What you'll learn

- How to parameterize base URLs per environment (local / CI / staging)
- `.env.local` / `.env.ci` / env-variable layering
- The capstone: you write a feature from scratch, solo

## Why it matters

The suite you built runs against `http://localhost:4200` and `http://localhost:3000`. In reality you'll eventually want to run the same suite against a deployed staging environment. That's a config change, not a code change.

And by now, you should be able to add a feature without a walkthrough. The capstone proves it.

## Prerequisites

- Module 14 complete
- `git checkout 15-start`

## Walkthrough

### 1. Env-based base URLs

`apps/web-e2e/playwright.config.ts`:

```ts
const webBaseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';
const apiBaseURL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000';
```

Environment takes precedence. Set either via shell, `.env`, or CI secrets.

### 2. `.env.example` as the source of truth

```
E2E_BASE_URL="http://localhost:4200"
E2E_API_BASE_URL="http://localhost:3000"
JWT_SECRET="dev-not-secret-pin-for-local-do-not-use-in-production"
```

Commit `.env.example`. Git-ignore `.env` / `.env.local`. Participants copy the example and edit locally.

For CI, set these via repository secrets / env vars rather than a committed file.

### 3. Run against a deployed backend

Assume staging is at `https://api.staging.yourproduct.com`:

```bash
E2E_API_BASE_URL=https://api.staging.yourproduct.com \
E2E_BASE_URL=https://staging.yourproduct.com \
npm run e2e
```

What needs to be true for this to work:

- The staging api has the `/test/*` seam enabled (dangerous — only do this for sealed staging envs, never prod)
- The staging web points at the staging api
- Your network allows Playwright to reach both

If any of those isn't true, you run against local and mock external dependencies (back to Module 10).

### 4. The `webServer` config

Remember `webServer` in `playwright.config.ts`:

```ts
webServer: [
  {
    command: 'npx nx run api:serve',
    url: `${apiBaseURL}/auth/me`,
    reuseExistingServer: !process.env['CI'],
    // ...
  },
  {
    command: 'npx nx run web:preview',
    url: webBaseURL,
    reuseExistingServer: !process.env['CI'],
    // ...
  },
],
```

- **Locally** — `reuseExistingServer: true` means if you're already running `npm start`, Playwright uses it. Otherwise it starts the servers for you.
- **CI** — `reuseExistingServer: false`, always starts fresh.

If you're running against a deployed environment, omit `webServer` entirely — Playwright expects the URL to already be reachable.

## The capstone

Write a feature from scratch covering a user flow we *haven't* tested yet. No walkthrough. Pick one:

### Option A: Project description editing

Add a UI affordance for editing a project's description (if the current app doesn't have one, add it). Write a feature that:

- Seeds a project via API
- Opens the project
- Edits the description through the UI
- Asserts via both UI and an API round-trip

### Option B: Task due-date edge cases

Write a feature covering:

- Tasks with past-due dates displaying differently (you may need to add visual indicators in the web app first)
- Creating a task with *no* due date
- Editing a task to clear its due date

### Option C: Bulk task status change

Add a UI for selecting multiple tasks and updating their status. Write a feature that seeds 5 tasks, selects 3, changes their status, verifies the other 2 are untouched.

### Option D: Propose your own

Anything that:

- Has a clear user-facing behavior
- Exercises both UI and API paths
- Has at least one edge case / error path
- Takes less than a day

For any option, your deliverable is:

1. Feature file (`apps/web-e2e/src/features/<area>/<name>.feature`) — tagged appropriately, 3+ scenarios
2. Step defs you reuse or add
3. Any POM additions (maintain the "no DOM in steps" rule)
4. All scenarios green twice in a row under `--workers 4`

## Run it

```bash
# Your new scenarios
npm run e2e -- --grep @capstone

# Whole suite — should still be green
npm run e2e
```

## Compare

```bash
git diff 15-complete -- apps/web-e2e
```

Note: `15-complete` in this repo contains *one possible* capstone solution. Yours will look different — that's the point.

## Cheat sheet

**Env-variable layering (leftmost wins):**

```
CLI env (E2E_BASE_URL=... npm run e2e)
 > .env.local
 > .env
 > playwright.config.ts defaults
```

**Running against staging:**

```bash
E2E_BASE_URL=https://staging.example.com \
E2E_API_BASE_URL=https://api.staging.example.com \
npm run e2e
```

Assumptions: the staging api has the `/test/*` seam (or your suite has been adapted to not need it), and your user has creds that work there.

**Capstone checklist:**

- [ ] Feature file in the right `features/<area>/` folder
- [ ] Tagged (`@capstone`, area tag, module tag)
- [ ] At least one happy-path scenario
- [ ] At least one error/edge scenario
- [ ] No `page.getByX` inside step defs (POM discipline from Module 02)
- [ ] Names scoped with `scenarioId` via seed fixtures (Module 07)
- [ ] Green twice in a row

## You're done

Seriously — if you finished the capstone, you've built real-world E2E testing skills. The patterns here (POM discipline, API-seeded isolation, fixtures, storageState, network interception) are what professional QA engineers use on production codebases.

**Next stops:**

- Apply these patterns to your own app. Start with the isolation discipline (the one lesson that saves the most time).
- Read the [`docs/concepts.md`](../../docs/concepts.md) reference when you need to jog your memory.
- Share the workshop with a teammate.

If you spot bugs or want to improve a module, open a PR — this is meant to stay alive.
