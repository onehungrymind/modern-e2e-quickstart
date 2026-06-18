# Module 09 — Users + isolation proof

**Estimated time: 30–40 min**

## Files you'll create / touch

| File | What happens |
|---|---|
| `apps/web-e2e/src/pages/users-list-page.ts` | Page object for the `/users` list |
| `apps/web-e2e/src/pages/user-detail-page.ts` | Page object for `/users/:id` |
| `apps/web-e2e/src/pages/profile-page.ts` | Page object for `/profile` |
| `apps/web-e2e/src/steps/extra.steps.ts` | Add user/profile step definitions |
| `apps/web-e2e/src/features/users/users.feature` | `@module-09` — users list, detail, empty state |

No new fixtures. No new seed endpoints. The isolation exercise requires only running the existing suite with extra flags.

---

## What you'll learn

- How to write page objects for read-heavy pages (`UsersListPage`, `UserDetailPage`, `ProfilePage`)
- How to seed a second named user within a scenario and navigate to their detail page by ID
- How the `E2E_<scenarioId>` naming contract prevents collisions under parallel workers
- How to verify isolation empirically with `--repeat-each` and `--workers`

## Why it matters

The users and profile pages are simpler than the project/task pages — they have no forms to submit and no mutations to track. That simplicity makes them a good place to demonstrate the isolation contract explicitly. Once you run the same three scenarios four workers wide and three repeats deep and see them stay green, the abstract rules become concrete.

The isolation contract is not just about this module. It is the reason every module since 07 seeded data with `E2E_` prefixes and `scenarioId` suffixes. This module closes the loop.

## Prerequisites

- Module 08 complete
- `git checkout 09-start`

## Walkthrough

### 1. `UsersListPage` — locating users by email

`apps/web-e2e/src/pages/users-list-page.ts` is intentionally minimal. The users list renders a flat list of user rows. There is no search, no pagination in the test data, and no complex interaction — you just need to assert presence:

```ts
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class UsersListPage extends BasePage {
  readonly list: Locator;

  constructor(page: Page) {
    super(page);
    this.list = page.getByTestId('users-list');
  }

  async goto() {
    await this.page.goto('/users');
  }

  userRowByEmail(email: string): Locator {
    return this.list.getByText(email).first();
  }
}
```

`userRowByEmail` uses `getByText` scoped inside `this.list`. The `.first()` call is defensive — email text could theoretically appear in more than one element if the layout changes. In practice it only appears once, but `.first()` prevents a "strict mode" failure if the page ever renders the email in two places (e.g., a tooltip).

The `goto()` method exists so steps can navigate directly without knowing the route. The route is the page object's concern, not the step's.

### 2. `UserDetailPage` — navigating by ID, asserting assigned tasks

`apps/web-e2e/src/pages/user-detail-page.ts` wraps the `/users/:id` view. The detail page shows user info and their assigned tasks:

```ts
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class UserDetailPage extends BasePage {
  readonly name: Locator;
  readonly email: Locator;
  readonly tasksList: Locator;
  readonly tasksEmptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('user-detail-name');
    this.email = page.getByTestId('user-detail-email');
    this.tasksList = page.getByTestId('user-detail-tasks-list');
    this.tasksEmptyState = page.getByTestId('user-detail-tasks-empty-state');
  }

  async gotoById(id: string) {
    await this.page.goto(`/users/${id}`);
  }

  assignedTask(title: string): Locator {
    return this.tasksList.getByText(title);
  }
}
```

`gotoById` is the same pattern as `ProjectDetailPage.gotoById` — the test knows the ID from the seed response and navigates directly, bypassing the list. This is how you access another user's detail page without that user appearing in any visible navigation element.

`assignedTask` looks up by full task title text. The title in the DB is `E2E_<title>_<scenarioId>`. Steps pass the full stored title directly — no additional resolution needed because the task was seeded for a specific named user (not for `scenarioWorld.seededUser`), so it is not tracked in `scenarioWorld.taskNames`.

### 3. `ProfilePage` — the simplest page object in the suite

`apps/web-e2e/src/pages/profile-page.ts` wraps the `/profile` route. The profile page surfaces the current user's role, which is what the `@module-09` role assertion uses:

```ts
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class ProfilePage extends BasePage {
  readonly info: Locator;

  constructor(page: Page) {
    super(page);
    this.info = page.getByTestId('profile-info');
  }

  async goto() {
    await this.page.goto('/profile');
  }
}
```

One locator. If the profile page later gains more sections, add locators here rather than using `page.getByText` in steps.

### 4. `extra.steps.ts` — user and profile steps

The user-related step definitions in `apps/web-e2e/src/steps/extra.steps.ts` continue the pattern from Module 08. The user steps need a named extra user, seeded with a known key so the step can retrieve the right ID:

```ts
Given(
  'an E2E member {string} user exists',
  async ({ scenarioWorld, seedUser }, key: string) => {
    const user = await seedUser({ role: 'member', emailPrefix: key });
    const extras = getExtraUsers(scenarioWorld as { extraUsers?: ExtraUsers });
    extras[key] = user;
  },
);
```

The `key` parameter (e.g., `"task_owner"`) becomes the `emailPrefix` — so the email stored in the DB is `E2E_task_owner@example.com`. The key also indexes `extraUsers`, letting `When I open the "task_owner" user detail page` look up the right ID without any additional tracking:

```ts
When(
  'I open the {string} user detail page',
  async ({ userDetailPage, scenarioWorld }, userKey: string) => {
    const extras = (scenarioWorld as { extraUsers?: ExtraUsers }).extraUsers;
    const user = extras?.[userKey];
    if (!user) throw new Error(`No extra user "${userKey}"`);
    await userDetailPage.gotoById(user.id);
  },
);
```

Assertion steps for the detail page:

```ts
Then(
  'I see the assigned task {string}',
  async ({ userDetailPage }, title: string) => {
    await expect(userDetailPage.assignedTask(title)).toBeVisible();
  },
);

Then('I see the user\'s empty tasks state', async ({ userDetailPage }) => {
  await expect(userDetailPage.tasksEmptyState).toBeVisible();
});
```

The `my profile shows role {string}` step is also in `extra.steps.ts`, used by auth scenarios that need to assert the current user's role after login:

```ts
Then('my profile shows role {string}', async ({ profilePage }, role: string) => {
  await expect(profilePage.info).toContainText(role);
});
```

### 5. The users feature

`apps/web-e2e/src/features/users/users.feature`:

```gherkin
@users @module-09
Feature: Users list and detail

  Background:
    Given an E2E member is logged in

  Scenario: users list shows the seeded dev users
    When I open "/users"
    Then I see a user with email "admin@example.com"
    And I see a user with email "alice@example.com"

  Scenario: user detail shows assigned tasks
    Given an E2E member "task_owner" user exists
    And a project "Assigned Tasks Project" seeded via the API for "task_owner"
    And a task "E2E_Their Task" in "Assigned Tasks Project" assigned to "task_owner"
    When I open the "task_owner" user detail page
    Then I see the assigned task "E2E_Their Task"

  Scenario: user with no assigned tasks shows empty state
    Given an E2E member "no_tasks" user exists
    When I open the "no_tasks" user detail page
    Then I see the user's empty tasks state
```

**Scenario 1** uses the dev-seed users (`admin@example.com`, `alice@example.com`). This is the one deliberate exception to the "never touch dev-seed users" rule: this scenario does not mutate those users, it only asserts they are visible in the list. Read-only assertions against stable data are safe.

**Scenario 2** seeds a fresh `task_owner` user, seeds a project for them, seeds a task assigned to them via `tasks.steps.ts`, then navigates to their detail page. Three distinct seed calls, zero UI interactions in the setup, one UI assertion.

**Scenario 3** seeds a `no_tasks` user and immediately navigates to their detail page. No project, no task. The empty-state element appears. Fast and direct.

### 6. The isolation contract — why it holds

Before running the isolation exercise, understand exactly what prevents collisions when workers run these scenarios in parallel.

**The three-layer contract:**

**Layer 1 — `E2E_` prefix on every row.**
`TestService.ensurePrefix` guarantees that every row created through the `/test/*` endpoints has an `E2E_` prefix. The `reset` endpoint deletes by prefix, not by ID. A non-E2E row created by the dev seed (`admin@example.com`) is never touched.

**Layer 2 — `scenarioId` suffix on every name.**
`randomBytes(4).toString('hex')` generates 4 bytes of cryptographic randomness per scenario. The probability of two running scenarios sharing a `scenarioId` is 1 in 4,294,967,296. Names in the DB look like:

```
E2E_task_owner_a1b2c3d4@example.com
E2E_Assigned Tasks Project_a1b2c3d4
E2E_Their Task_a1b2c3d4
```

Worker A running scenario X and Worker B running scenario Y — even the same scenario — produce non-overlapping names. They can run simultaneously without any locking, without any serialization.

**Layer 3 — ID-based navigation.**
Steps navigate to projects and users by ID, not by name. When two workers each seed a project called `"E2E_Assigned Tasks Project_<different-id>"`, they navigate to different rows by their respective IDs. The UI filter (`row(name)`) filters by the full unique name, so even a list view assertion only sees the current scenario's data.

**What happens if you break the contract:**

| Broken rule | Failure mode |
|---|---|
| No `E2E_` prefix | `reset` doesn't clean it up; rows accumulate across runs |
| No `scenarioId` suffix | Two parallel workers create same-named rows; list assertions may see both |
| Name-based navigation to other users' data | Works in serial, silently wrong in parallel |
| Cleanup skipped on crash | Orphan rows accumulate; `globalTeardown` saves you but only if `reset` runs |

### 7. The isolation exercise — verify it empirically

No new code required. Run the module-09 scenarios across four workers, repeated three times each:

```bash
npx nx e2e web-e2e -- --grep @module-09 --repeat-each 3 --workers 4
```

What to watch:

- All 9 scenario runs (3 scenarios × 3 repeats) should be green.
- Playwright assigns workers non-deterministically. Some workers run the same scenario back-to-back; some run them interleaved.
- Open the HTML report after the run: each scenario's seeded-fixture attachment (from the `test.info().attach(...)` call in the data-table seed step) shows different IDs and names per run — even for the same scenario text.

If any scenario fails, inspect the error. Common causes:

- **`toBeVisible()` timeout on a task that wasn't there**: the task name wasn't resolved correctly — check `taskNames` in the world.
- **`to have count 0` fails**: another worker's data appeared in the same user's task list — a sign that you used a shared user ID instead of a fresh `seedUser` per scenario.
- **`No extra user "task_owner"` error**: steps ran out of order — check that `Given an E2E member "task_owner" user exists` is before the seed-project step.

For the full suite stress test (optional, runs for ~2–3 minutes):

```bash
npx nx e2e web-e2e -- --repeat-each 3 --workers 4
```

This is the Phase B exit criterion: green twice in a row, under 120 seconds. If you hit it, the isolation contract is proven.

## Exercise

**Part A — isolation inspection**

Before running `--repeat-each`, add a `console.log` inside the `scenarioWorld` fixture setup to print the `scenarioId` for each scenario:

```ts
scenarioWorld: async ({}, use) => {
  const world: ScenarioWorld = {
    scenarioId: randomBytes(4).toString('hex'),
    // ...
  };
  console.log(`[world] scenarioId=${world.scenarioId}`);
  await use(world);
  // teardown ...
},
```

Run `--repeat-each 3 --workers 4 --grep @module-09` and look at the console output. You should see 12 unique IDs (3 scenarios × 3 repeats × 1 ID each). Verify that none repeat.

**Part B — break and restore**

In `fixtures/test.ts`, temporarily remove the `scenarioId` suffix from `seedProject`:

```ts
// temporarily break isolation:
const uniqueName = input.name ?? 'project'; // was: `${baseName}_${scenarioWorld.scenarioId}`
```

Run `--repeat-each 3 --workers 4 --grep @module-09`. Observe which scenarios become flaky or fail. Then restore the suffix and confirm the run is green again.

This hands-on breakage is the fastest way to viscerally understand why the suffix is not optional.

## Run it

```bash
npm run e2e -- --grep @module-09
```

Isolation proof:

```bash
npx nx e2e web-e2e -- --grep @module-09 --repeat-each 3 --workers 4
```

## Compare

```bash
git diff 09-complete -- apps/web-e2e
```

## Cheat sheet

**The isolation contract in one diagram:**

```
  seed call                DB row                  locator
  ---------                ------                  -------
  { emailPrefix: "task_owner" }
       ↓
  email: "E2E_task_owner_a1b2c3d4@example.com"
                                ↑
                       scenarioId suffix
                                               userRowByEmail(email)
                                               → scoped to users-list
                                               → text match (exact)
```

**Page object summary:**

| Class | Route | Key locators |
|---|---|---|
| `UsersListPage` | `/users` | `list` (testid), `userRowByEmail(email)` |
| `UserDetailPage` | `/users/:id` | `name`, `email`, `tasksList`, `tasksEmptyState`, `assignedTask(title)` |
| `ProfilePage` | `/profile` | `info` (testid) |

**Three-layer isolation summary:**

| Layer | Mechanism | Where enforced |
|---|---|---|
| Namespace | `E2E_` prefix on every row | `TestService.ensurePrefix` (server) |
| Uniqueness | `scenarioId` suffix on names | `seedProject` / `seedTask` fixtures (client) |
| Navigation | ID-based routes, not name-based | `gotoById` in page objects |

**Cleanup hierarchy (reminder):**

1. Per-scenario teardown in `scenarioWorld` fixture — deletes tracked task and project IDs
2. `globalTeardown` `/test/reset` — sweeps all `E2E_` rows; catches crashes before teardown ran

## Next

→ [Module 10 — Network mocking & interception](../10-network-mocking-interception/README.md)
