# Module 06 — API + UI hybrid

## What you'll learn

- The "seed via API, assert via UI" pattern
- Why tests should never use real / seed-data users
- The `E2E_` prefix isolation discipline
- Why each scenario needs its own `scenarioId`
- The `/test/*` seam on the api — what it is and why it's env-guarded

## Why it matters

This is the most important module in the workshop. The patterns here are what make a real-world E2E suite fast, reliable, and parallelizable.

If every test clicks through the UI to create its fixtures, your suite is slow, flaky, and couples test setup to UI changes. If tests mutate shared data, they break in parallel. The hybrid pattern — API for setup, UI for the actual interaction — solves both.

## Prerequisites

- Module 05 complete
- `git checkout 06-start`

## Walkthrough

### 1. Two seeds, two purposes

- **Dev seed** (`apps/api/prisma/seed.ts`) — creates `admin@example.com`, `alice@example.com`, `bob@example.com`. For developer experience when using the app locally. Runs automatically on `nx serve api` via the `prisma-seed` target.
- **E2E seed** — created on demand per scenario via `/test/seed/*` endpoints. Always `E2E_`-prefixed.

**Rule:** tests never touch dev-seed users. Tests never leave behind data.

### 2. The `/test/*` seam

`apps/api/src/test/test.controller.ts` exposes four endpoints, only mounted when `NODE_ENV !== 'production'`:

| Method | Path | Returns |
|---|---|---|
| POST | `/test/seed/user` | `{id, email, password, token, role, name}` |
| POST | `/test/seed/project` | `{id, name, ownerId}` |
| POST | `/test/seed/task` | `{id}` |
| POST | `/test/reset` | 204 — sweeps everything `LIKE 'E2E_%'` |

Three things worth noting:

- `seed/user` returns the *plaintext password* so tests can log in through the UI if they want to.
- `seed/project` and `seed/task` auto-prefix the name/title with `E2E_` if the caller didn't.
- `/test/reset` is called by `globalSetup` and `globalTeardown` — belt + suspenders for aborted runs.

### 3. Typed seed helpers

`apps/web-e2e/src/support/seed/index.ts` wraps the endpoints:

```ts
export const seed = {
  user(input: SeedUserInput = {}): Promise<SeededUser> {
    return apiRequest<SeededUser>('/test/seed/user', { method: 'POST', body: input });
  },
  project(input: SeedProjectInput): Promise<SeededProject> { ... },
  task(input: SeedTaskInput): Promise<SeededTask> { ... },
  async projectWithTasks(input): Promise<{ project, tasks }> { ... },
  reset(): Promise<void> { ... },
};
```

### 4. Seed fixtures with scenario-scoped uniqueness

The critical trick: the fixture version of these helpers appends `scenarioWorld.scenarioId` to names and tracks IDs for cleanup.

```ts
// fixtures/test.ts
seedProject: async ({ scenarioWorld }, use) => {
  await use(async (input) => {
    const baseName = input.name ?? 'project';
    const uniqueName = `${baseName}_${scenarioWorld.scenarioId}`;
    const p = await seed.project({ ...input, name: uniqueName });
    scenarioWorld.createdProjectIds.push(p.id);
    scenarioWorld.seededProject = p;
    scenarioWorld.projectNames.set(baseName, p.name);
    return p;
  });
},
```

Feature files use readable base names:

```gherkin
Given a project "Task CRUD Project" seeded via the API for the current user
```

DB ends up with `E2E_Task CRUD Project_abc12345` — unique per scenario. Steps that look up by base name call `resolveProjectName(scenarioWorld, baseName)`:

```ts
When('I open the project {string}', async ({ projectsListPage, scenarioWorld }, name: string) => {
  const actual = resolveProjectName(scenarioWorld, name);
  await projectsListPage.goto();
  await projectsListPage.openProject(actual);
});
```

### 5. Seed via API, assert via UI

The signature scenario:

```gherkin
@projects @module-06 @smoke
Scenario: the user's seeded project appears in the list
  Given an E2E member is logged in
  And a project "First Client Launch" seeded via the API for the current user
  When I visit the projects page
  Then I see the project "First Client Launch" in the list
```

The `Given` calls take milliseconds. The `When`/`Then` exercise the real UI. The whole scenario is ~600ms vs. 3-4 seconds if you created the project through the UI.

### 6. Cleanup, two ways

**Primary** — per-scenario fixture teardown deletes tracked IDs:

```ts
scenarioWorld: async ({}, use) => {
  const world = { createdProjectIds: [], createdTaskIds: [], ... };
  await use(world);
  for (const id of world.createdTaskIds) await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
  for (const id of world.createdProjectIds) await apiRequest(`/projects/${id}`, { method: 'DELETE' });
},
```

**Belt + suspenders** — `globalTeardown` calls `/test/reset`. If a scenario crashed before its hook ran, the sweep catches the orphan.

## Exercise

1. Write a scenario that seeds a project via the API, creates a task through the UI, verifies the task is visible, then asserts the API actually has a matching record. (Hint: use `apiRequest` directly in the Then step — or build a small assertion helper.)
2. Introduce a second scenario-unique suffix: instead of `scenarioId` being just the 4-byte hex, prefix it with the worker index. Prove to yourself that a `--repeat-each 3 --workers 4` run doesn't collide.

## Run it

```bash
npm run e2e:projects
```

## Compare

```bash
git diff 06-complete -- apps/web-e2e
```

## Cheat sheet

**Decision: seed via API or drive through UI?**

| Intent | Approach |
|---|---|
| Precondition (user has a project, I want to edit it) | API seed |
| The thing being tested (project creation form validation) | UI |
| Data needs specific status/priority/dueDate | API seed |
| Navigating the authenticated shell | `Given I am logged in as "alice"` (stored state) + API seed |

**The isolation contract:**

- Every row a test creates: name/title/email prefixed `E2E_`
- Every scenario: its own `scenarioId` appended to names
- Every test scenario: either cleans up its IDs, or trusts `/test/reset` in teardown to sweep

Break any of these and parallel workers will step on each other.

## Next

→ [Module 07 — Network mocking & interception](../07-network-mocking-interception/README.md)
