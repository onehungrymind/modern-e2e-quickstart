# Module 03 — Fixtures, hooks, world

## What you'll learn

- What Playwright fixtures are and how to extend them
- How to wire POMs as fixtures so step defs can just destructure them
- The "scenario world" pattern — per-scenario state, tracked for cleanup
- `Before` / `After` hooks via fixture teardown

## Why it matters

In Module 02 every step started with `new LoginPage(page)`. That's boilerplate and it lies about scope — a page object is scenario-scoped, not step-scoped. Fixtures solve both: declared once, created fresh per scenario, torn down automatically.

This module is the plumbing everything else in the workshop stands on.

## Prerequisites

- Module 02 complete
- `git checkout 03-start`

## Walkthrough

### 1. Extend the base test

Create `apps/web-e2e/src/fixtures/test.ts`:

```ts
import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage } from '../pages/login-page';
import { ProjectsListPage } from '../pages/projects-list-page';

type Fixtures = {
  loginPage: LoginPage;
  projectsListPage: ProjectsListPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  projectsListPage: async ({ page }, use) => {
    await use(new ProjectsListPage(page));
  },
});

export const expect = test.expect;
export const { Given, When, Then } = createBdd(test);
```

What changed:

- `test.extend<Fixtures>({ ... })` declares new fixtures with their setup/teardown shape.
- Each fixture is `async (deps, use) => { ... await use(value); ... }`. Code before `use()` runs when the fixture is requested; code after runs at teardown.
- `createBdd(test)` — feed the extended `test` into `playwright-bdd` so step defs get all fixtures.

### 2. Update steps to use fixtures

`apps/web-e2e/src/steps/auth.steps.ts`:

```ts
import { Given, When, Then, expect } from '../fixtures/test';

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

When(
  'I sign in with email {string} and password {string}',
  async ({ loginPage }, email: string, password: string) => {
    await loginPage.signIn(email, password);
  },
);

Then('I see the error {string}', async ({ loginPage }, message: string) => {
  await expect(loginPage.errorMessage).toHaveText(message);
});
```

Notice what's gone: no `new LoginPage(page)`, no repeated instantiation. Steps read like prose.

### 3. Add `scenarioWorld`

A per-scenario state bag for stuff that *isn't* a page object. Add to `fixtures/test.ts`:

```ts
import { randomBytes } from 'node:crypto';

type ScenarioWorld = {
  scenarioId: string;
  createdProjectIds: string[];
  createdUserIds: string[];
};

// in the extend block:
scenarioWorld: async ({}, use) => {
  const world: ScenarioWorld = {
    scenarioId: randomBytes(4).toString('hex'),
    createdProjectIds: [],
    createdUserIds: [],
  };
  await use(world);
  // everything below this line is the `After` hook
  for (const id of world.createdProjectIds) {
    await fetch(`http://localhost:3000/projects/${id}`, { method: 'DELETE' });
  }
},
```

Two important ideas:

- **`scenarioId`** — a unique suffix for every scenario. Per Module 06, seed helpers append it to project/task names so parallel workers never collide.
- **Cleanup in teardown** — anything pushed to `createdProjectIds` gets deleted when the fixture tears down. Steps just do `scenarioWorld.createdProjectIds.push(id)` and forget about it.

### 4. Cucumber hooks (the old way)

`playwright-bdd` also supports classic `Before` / `After` hooks via `createBdd(test).Before(...)` — but they're usually a step back from fixtures. With fixtures:

- Setup + teardown live in one place.
- TypeScript knows about your state shape.
- Dependencies are explicit (`scenarioWorld` depends on nothing; `authenticatedPage` depends on both `page` and `scenarioWorld`).

Use hooks when you truly need tag-filtered setup (e.g., `Before({ tags: '@role-admin' }, ...)`). For most things, prefer fixtures.

## Exercise

Add a third fixture: `apiClient`. It should expose:

- `get<T>(path: string, token?: string): Promise<T>`
- `post<T>(path: string, body: unknown, token?: string): Promise<T>`
- `delete(path: string, token?: string): Promise<void>`

Then update your `scenarioWorld` teardown to use `apiClient` instead of raw `fetch`. Write a scenario that creates a user via the API, verifies they can log in, and leaves cleanup to the teardown.

**Hint:** Playwright has a built-in `request` fixture (`APIRequestContext`), which is roughly equivalent. Read `features/auth/expired-session.feature` + its steps for how the canonical solution does this.

## Run it

```bash
npm run e2e -- --grep @module-03
```

## Compare

```bash
git diff 03-complete -- apps/web-e2e
```

## Cheat sheet

**Fixture declaration shape:**

```ts
export const test = base.extend<MyFixtures>({
  myFixture: async ({ deps }, use, testInfo) => {
    // setup
    const value = ...;
    await use(value);
    // teardown (After)
  },
});
```

**Fixture scoping:**
- Default — **test-scoped** (scenario-scoped in BDD). Fresh per scenario.
- `{ scope: 'worker' }` — shared across scenarios in one worker.
- Use worker scope for expensive things that are safe to share (seeded read-only users, browser instance).

**Gotcha:** don't forget `await use(value)` — the `use()` call is what "yields" the fixture to the test. Forget it and the fixture hangs forever.

## Next

→ [Module 04 — Tagging, outlines, data tables](../04-tagging-outlines-data-tables/README.md)
