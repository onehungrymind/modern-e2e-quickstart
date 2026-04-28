# Concepts reference

A tour of every pattern used in the E2E suite. Each section names the concept, explains *why* it exists, and points to the file where you can see it in action.

If you're looking for the teaching path (not the reference), start at **[`modules/00-setup/README.md`](../modules/00-setup/README.md)** instead.

---

## 1. BDD with `playwright-bdd`

**What.** We write `.feature` files in Gherkin, and step definitions as TypeScript functions. `playwright-bdd` compiles features into real Playwright `test(...)` calls at `bddgen` time, writing generated specs into `apps/web-e2e/src/.features-gen/`. Playwright then runs them like any other spec.

**Why.** The Gherkin layer separates *intent* (what the user is trying to do) from *mechanics* (how to do it in the browser). Product folks can read it. Tests stay readable over time. The "Given / When / Then" structure forces you to write tests in arrange / act / assert shape.

**Where to look.**
- Features: `apps/web-e2e/src/features/**/*.feature`
- Step defs: `apps/web-e2e/src/steps/*.steps.ts`
- Config: `apps/web-e2e/playwright.config.ts` — `defineBddConfig(...)`

**Example — `features/auth/login.feature`:**

```gherkin
@auth @module-01
Feature: Login

  Background:
    Given a seeded E2E member user

  @smoke
  Scenario: successful login with seeded member credentials
    Given I am on the login page
    When I sign in with the seeded user's credentials
    Then I land on the projects page
```

**Matching step def — `steps/auth.steps.ts`:**

```ts
Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});
```

Playwright runs it via `nx e2e web-e2e` — the project's `e2e` target `dependsOn: ['bdd-gen']` so features regenerate automatically.

---

## 2. Page Objects (POM)

**What.** Every page in the app has a corresponding Page Object class under `apps/web-e2e/src/pages/`. The POM exposes *named locators* (`loginPage.emailInput`) and *high-level methods* (`loginPage.signIn(email, password)`).

**Why.** Step definitions should read like product specs, not DOM puppetry. When the UI changes, you update one POM — not fifty step definitions. It also makes tests self-documenting: `projectsListPage.row(name).click()` is clearer than a buried `getByTestId(...).filter(...).click()` chain.

**Hard rule in this repo:** step definitions never touch `page.getByX()` directly. The only bare-page APIs a step may call are `page.goto(path)`, `page.route(...)`, and `context.clearCookies()` — everything DOM-shaped goes through a POM. [`apps/web-e2e/src/steps/auth.steps.ts`](../apps/web-e2e/src/steps/auth.steps.ts) is the poster child.

**Example — `pages/login-page.ts`:**

```ts
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByTestId('login-error-message');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

POMs are available to steps via fixtures (see §4).

---

## 3. Locator strategy (layered)

**What.** In order: `getByRole` → `getByLabel` → `getByText` → `getByTestId` → `.filter({ hasText })`.

**Why.** Playwright's guidance is accessibility-first — if an element has a visible label or ARIA role, use it. Tests implicitly verify accessibility that way. Test IDs are an escape hatch for things without natural roles (row containers, toasts, empty states).

**Rule against dynamic IDs in test-IDs.** We never write `data-testid="projects-list-item-{id}"`. Rows get a stable test-ID (`projects-list-item`) and disambiguate by content filter.

**Example from `pages/projects-list-page.ts`:**

```ts
row(name: string): Locator {
  return this.list.getByTestId('projects-list-item').filter({ hasText: name });
}
```

Uniqueness for parallel scenarios comes from scenario-scoped unique names — see §6.

---

## 4. Fixtures — `scenarioWorld`, seed helpers, POM injection

**What.** Playwright fixtures are per-test state that get created on demand and torn down after. We extend the base `test` from `playwright-bdd` with:

- **`scenarioWorld`** — a per-scenario object holding `seededUser`, `createdProjectIds`, `projectNames` map, a `scenarioId` suffix, etc. Tracks cleanup targets.
- **`seedUser` / `seedProject` / `seedTask`** — typed functions that wrap `/test/seed/*` endpoints, auto-append a unique `scenarioId`, and register the created IDs for cleanup.
- **`loginPage`, `projectsListPage`, `projectDetailPage`, `appShell`, …** — instances of each POM, created fresh per scenario.
- **`session`** — helper wrapping `page + context` for session-level operations (clear cookies, set stored auth, load storageState).

**Where to look.** [`apps/web-e2e/src/fixtures/test.ts`](../apps/web-e2e/src/fixtures/test.ts)

**Why.** Steps stay pure and DRY. Cleanup is automatic (any IDs in `createdProjectIds` are deleted after the scenario). POMs don't have to be instantiated in every step.

**How steps use them:**

```ts
When('I create a project named {string}', async ({ projectsListPage }, name: string) => {
  await projectsListPage.createProject(name);
});
```

---

## 5. The `E2E_` prefix isolation pattern

**What.** Every row this suite creates in the database has an `E2E_` prefix in its name/email/title. The API auto-prefixes if the caller didn't, so enforcement is cheap. `POST /test/reset` sweeps everything `LIKE 'E2E_%'`.

**Why.** "E2E tests never touch real data and never leave behind data" is the core discipline. The prefix gives us two cleanup mechanisms:
1. **Primary** — per-scenario `After` hook deletes IDs tracked in `scenarioWorld`.
2. **Belt + suspenders** — `globalTeardown` calls `/test/reset` to sweep anything an aborted scenario abandoned.

**Example — `apps/api/src/test/test.service.ts`:**

```ts
async seedProject(dto: SeedProjectDto) {
  const name = ensurePrefix(dto.name, `project_${randomSuffix()}`);
  const project = await this.prisma.project.create({
    data: { name, description: dto.description ?? null, ownerId: dto.ownerId },
  });
  return { id: project.id, name: project.name, ownerId: project.ownerId };
}
```

---

## 6. Scenario-scoped uniqueness

**What.** Every scenario gets a random 4-byte `scenarioId` on entry. The `seedProject` / `seedTask` fixtures append that ID to whatever name you pass. So `"Task CRUD Project"` in the feature file becomes `"E2E_Task CRUD Project_abc12345"` in the DB. Feature files are still readable; parallel workers never collide.

**Why.** Scenarios run in parallel across 4 workers, all hitting a single SQLite DB. If two workers seed a project named "Filter Project" at the same time, strict-mode locators blow up with "resolved to 2 elements". Per-scenario suffixes eliminate that.

**Resolution at lookup time.** Steps that refer to the base name (`"Filter Project"`) call `resolveProjectName(world, baseName)` to get the actual unique DB name, then pass *that* to the POM.

**Where to look.** [`apps/web-e2e/src/fixtures/test.ts`](../apps/web-e2e/src/fixtures/test.ts) — `seedProject` fixture + `resolveProjectName` export.

---

## 7. `globalSetup` / `globalTeardown`

**What.**
- `globalSetup` runs once before any test: calls `/test/reset`, seeds 3 baseline E2E_ users (admin/alice/bob), logs each in via the real UI, writes `storageState` to `apps/web-e2e/.auth/*.json`.
- `globalTeardown` runs once after all tests: calls `/test/reset` again.

**Why.** The storageState files let any scenario tagged as needing a role skip the login UI entirely (see §8). The reset at both ends gives every run a clean slate regardless of whether the previous run crashed.

**Where to look.**
- [`apps/web-e2e/src/support/global-setup.ts`](../apps/web-e2e/src/support/global-setup.ts)
- [`apps/web-e2e/src/support/global-teardown.ts`](../apps/web-e2e/src/support/global-teardown.ts)

---

## 8. `storageState` per role

**What.** Each of admin / alice / bob has a `.auth/<role>.json` file containing their logged-in browser state (cookies + localStorage). Scenarios can "log in as" a role without running the UI login form.

**Why.** Login is slow (~500ms through the form) and most scenarios don't care *how* the user logged in — they care about what happens next. Login-once-per-worker + reuse stored state shaves real time off the suite.

**How tests use it.** Via the `Given I am logged in as {role}` composite step — [`steps/auth-session.steps.ts`](../apps/web-e2e/src/steps/auth-session.steps.ts):

```ts
Given('I am logged in as {string}', async ({ session }, role: string) => {
  await session.loadStorageStateForRole(role as E2ERole);
});
```

---

## 9. API + UI hybrid

**What.** Set up fixtures via the API (fast), drive and assert through the UI (realistic).

**Why.** If every test logs in, navigates, searches, and creates 3 projects through the UI, the suite is 5 minutes long and flaky. Seed the prerequisites via `/test/seed/*`, then let the UI scenario focus on one specific interaction.

**Example — `features/projects/project-crud.feature`:**

```gherkin
Scenario: the user's seeded project appears in the list
  Given a project "First Client Launch" seeded via the API for the current user
  When I visit the projects page
  Then I see the project "First Client Launch" in the list
```

The `Given` hits `/test/seed/project` (milliseconds). The `When` and `Then` use the real UI.

---

## 10. Network interception via `page.route`

**What.** Playwright lets you intercept and fulfill network requests at the browser level. We use it to simulate API errors, slow responses, and auth failures without touching the real API.

**Why.** You want to test "what happens if the server is down" *without* taking the server down. You want to test 401 handling *without* corrupting real tokens.

**Example — `steps/network.steps.ts`:**

```ts
Given('the API returns 500 for the projects list', async ({ page }) => {
  await page.route(
    (url) => url.pathname === '/projects' && url.port === '3000',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          message: 'Internal Server Error',
          error: 'Server Error',
        }),
      });
    },
  );
});
```

Used in [`features/projects/network-mock.feature`](../apps/web-e2e/src/features/projects/network-mock.feature) and [`features/projects/network-slow.feature`](../apps/web-e2e/src/features/projects/network-slow.feature).

---

## 11. Tags, grep, scenario outlines, data tables

**Tags.** Every scenario can be tagged (`@auth`, `@module-04`, `@smoke`, `@flaky`). Playwright's `--grep` / `--grep-invert` run filtered subsets: `npm run e2e:smoke` runs just `@smoke`.

**Scenario Outlines** — when you have the same scenario shape run against different inputs. [`features/auth/login-outline.feature`](../apps/web-e2e/src/features/auth/login-outline.feature) loops bad credentials through one set of steps.

**Data tables** — when a step needs a structured payload. [`features/projects/project-crud.feature`](../apps/web-e2e/src/features/projects/project-crud.feature) seeds a project with a table of tasks:

```gherkin
Given a project "Planning Session" seeded via the API for the current user with tasks:
  | title                 | status  | priority |
  | Draft agenda          | todo    | high     |
  | Book conference room  | doing   | medium   |
  | Send invites          | done    | medium   |
```

The step handler receives a `DataTable` and loops `.hashes()`.

---

## 12. Parallel, retries, and controlled flake

**What.** `playwright.config.ts` sets `fullyParallel: true` with 4 workers. Each test runs in its own browser context. With the isolation patterns above (§5, §6), parallelism is safe.

**The `@flaky` demo.** [`features/flaky.feature`](../apps/web-e2e/src/features/flaky.feature) deliberately violates the isolation pattern (shared project name, no cleanup). Run it with `npm run e2e:flaky` — you'll see intermittent failures under parallel load. The fix is applying the same discipline the rest of the suite uses. That's Module 09.

---

## 13. 401 → redirect to login (global auth handler)

**What.** `apps/web/src/api/client.ts` exposes `setUnauthorizedHandler(fn)`. `apiFetch` invokes it on a 401 response *only when the request included a Bearer token* (so login failures don't trigger it). The auth context registers a handler that flips auth state to `anonymous`; `RequireAuth` then navigates to `/login?returnTo=<currentPath>`.

**Why.** A user whose token expires shouldn't see a raw "Unauthorized" error string. They should be bounced to login with their destination preserved.

**E2E coverage.** [`features/auth/expired-session.feature`](../apps/web-e2e/src/features/auth/expired-session.feature) intercepts authenticated requests with a 401 stub and asserts the redirect.

---

## 14. The dev seed vs. the E2E seed

**Two separate seeds, intentionally.**

- **Dev seed** (`apps/api/prisma/seed.ts`) runs automatically on `nx serve api` — creates `admin@example.com`, `alice@example.com`, `bob@example.com` and realistic projects/tasks. For the *developer experience* of using the app.
- **E2E seed** (`/test/seed/*` endpoints) — creates `E2E_`-prefixed data. Used *only* by the E2E suite.

Tests never touch dev users. If your scenario needs an admin, it seeds one: `await seedUser({ role: 'admin' })` — you get back `{id, email, password, token}`.

---

## File tree cheat sheet

```
apps/web-e2e/src/
├── features/              .feature files, grouped by feature area
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── users/
│   └── flaky.feature
├── steps/                 step def files, grouped by domain
│   ├── auth.steps.ts
│   ├── auth-session.steps.ts
│   ├── projects.steps.ts
│   ├── tasks.steps.ts
│   ├── network.steps.ts
│   ├── network-extra.steps.ts
│   └── extra.steps.ts
├── pages/                 POMs — one class per page
│   ├── base-page.ts
│   ├── app-shell-page.ts
│   ├── login-page.ts
│   ├── projects-list-page.ts
│   ├── project-detail-page.ts
│   ├── users-list-page.ts
│   ├── user-detail-page.ts
│   ├── profile-page.ts
│   └── task-form.ts       sub-POM composed into project-detail-page
├── fixtures/
│   └── test.ts            extended test + createBdd
├── support/
│   ├── env.ts             E2E_BASE_URL, E2E_API_BASE_URL, roles
│   ├── api-client.ts      thin fetch wrapper
│   ├── seed/
│   │   └── index.ts       typed seed helpers
│   ├── session.ts         SessionHelper — cookies + localStorage
│   ├── global-setup.ts
│   └── global-teardown.ts
├── smoke.spec.ts          plain Playwright — architecture smoke
└── playwright.config.ts   defineBddConfig + dual webServer + projects
```

---

## Where to go next

- New to E2E? Start at [`modules/00-setup/README.md`](../modules/00-setup/README.md).
- Want to explore a specific pattern? Jump to the feature file referenced in each section above and read it end-to-end — `.feature` → `.steps.ts` → POM.
- Working on a real codebase and want to crib patterns? The isolation strategy (§5, §6) and POM discipline (§2) are the two biggest wins; adopt those first.
