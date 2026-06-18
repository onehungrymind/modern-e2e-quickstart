# Module 08 — Projects & tasks with the hybrid pattern

**Estimated time: 40–50 min**

## Files you'll create / touch

| File | What happens |
|---|---|
| `apps/web-e2e/src/pages/task-form.ts` | New page object for the task create/edit form |
| `apps/web-e2e/src/steps/tasks.steps.ts` | All task Given/When/Then step definitions |
| `apps/web-e2e/src/steps/extra.steps.ts` | Utility steps: ownership, search, validation, profile |
| `apps/web-e2e/src/steps/projects.steps.ts` | Remaining project steps (data-table seed, tasks assertion) |
| `apps/web-e2e/src/features/projects/list-search.feature` | `@module-08` — multi-project seed + search |
| `apps/web-e2e/src/features/projects/create-validation.feature` | `@module-08` — UI creation with description |
| `apps/web-e2e/src/features/projects/ownership.feature` | `@module-08` — owner/admin delete rules |
| `apps/web-e2e/src/features/tasks/task-crud.feature` | `@module-08` — add/edit/delete via UI |
| `apps/web-e2e/src/features/tasks/task-filter.feature` | `@module-08` — status filter with API-seeded data table |
| `apps/web-e2e/src/features/tasks/task-assignee.feature` | `@module-08` — assignment via UI |

---

## What you'll learn

- How to build the full task create/edit/delete workflow using a shared `TaskForm` page object
- How `resolveTaskTitle` mirrors `resolveProjectName` for task uniqueness
- How `extra.steps.ts` groups utility steps that span pages (ownership, search, profile, validation)
- How to mix API-seeded preconditions with multi-step UI interaction in a single scenario
- How to use the data-table seed pattern for bulk fixture creation
- How the ownership step pattern works when you need a second user in the same scenario

## Why it matters

Module 07 established the pattern with one scenario. This module builds the real feature coverage that a production E2E suite needs: multiple seeded projects, search, ownership rules, task CRUD, status filtering, and assignment. Every scenario uses the same hybrid discipline — API for preconditions, UI for the feature under test.

If you find yourself tempted to use the UI to create tasks just so you can test editing them, that is a signal to stop and seed. The setup cost of clicking through a creation form compounds quickly across twenty scenarios.

## Prerequisites

- Module 07 complete
- `git checkout 08-start`

## Walkthrough

### 1. `TaskForm` — a composed page object

`apps/web-e2e/src/pages/task-form.ts` wraps the task modal that appears both when adding a new task and when editing an existing one. It is composed into `ProjectDetailPage` (not passed as a fixture) because it only ever appears on the project detail view:

```ts
import type { Locator, Page } from '@playwright/test';

export class TaskForm {
  readonly page: Page;
  readonly root: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly statusSelect: Locator;
  readonly prioritySelect: Locator;
  readonly dueDateInput: Locator;
  readonly assigneeSelect: Locator;
  readonly saveButton: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('task-form');
    this.titleInput = this.root.getByLabel('Title');
    this.descriptionInput = this.root.getByLabel('Description');
    this.statusSelect = this.root.getByLabel('Status');
    this.prioritySelect = this.root.getByLabel('Priority');
    this.dueDateInput = this.root.getByLabel('Due date');
    this.assigneeSelect = this.root.getByLabel('Assignee');
    this.saveButton = this.root.getByRole('button', { name: 'Save' });
    this.createButton = this.root.getByRole('button', { name: 'Create' });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' });
    this.deleteButton = this.root.getByRole('button', { name: 'Delete' });
  }
```

All locators are scoped to `this.root` (the `task-form` test ID), so they never accidentally match elements elsewhere on the page.

The save/create methods wait for the form to detach before returning — that assertion is the "it worked" signal:

```ts
  async waitForDetached() {
    await this.root.waitFor({ state: 'detached' });
  }

  async save() {
    await this.saveButton.click();
    await this.waitForDetached();
  }

  async create() {
    await this.createButton.click();
    await this.waitForDetached();
  }
```

`deleteWithConfirm` registers a one-shot dialog handler before clicking Delete. The `page.once('dialog', ...)` pattern ensures only the next dialog is accepted — not all future dialogs:

```ts
  async deleteWithConfirm() {
    this.page.once('dialog', (d) => d.accept());
    await this.deleteButton.click();
  }
```

### 2. `tasks.steps.ts` — all task step definitions

`apps/web-e2e/src/steps/tasks.steps.ts` follows the same fixture-first pattern established in Module 07. Each step definition destructures exactly the fixtures it needs and resolves names through `resolveTaskTitle`.

**Seed steps** — these are Given steps that call the `seedTask` fixture to create task preconditions via the API:

```ts
Given(
  'a task {string} in {string} with status {string}',
  async ({ scenarioWorld, seedTask }, title: string, projectName: string, status: string) => {
    const projectId = projectIdFromWorld(scenarioWorld, projectName);
    await seedTask({
      projectId,
      title: title.replace(/^E2E_/, ''),
      status: status as 'todo' | 'doing' | 'done',
    });
  },
);
```

The `.replace(/^E2E_/, '')` strips any `E2E_` prefix the feature writer added — the seed fixture adds it back with the scenario ID suffix. This means both `"My Task"` and `"E2E_My Task"` work in the feature file.

`projectIdFromWorld` resolves the project name to an ID via the world's `seededProject`:

```ts
function projectIdFromWorld(
  world: { seededProject?: { id: string; name: string }; projectNames: Map<string, string> },
  baseName: string,
): string {
  if (world.seededProject && world.projectNames.get(baseName) === world.seededProject.name) {
    return world.seededProject.id;
  }
  if (!world.seededProject) {
    throw new Error('No seeded project — run a "Given a project ..." step first');
  }
  return world.seededProject.id;
}
```

The error message is intentional — it catches ordering mistakes in feature files immediately rather than producing a confusing Prisma error.

**UI interaction steps** — When steps drive the browser through `projectDetailPage` and `taskForm`:

```ts
When('I add a task titled {string}', async ({ projectDetailPage }, title: string) => {
  await projectDetailPage.createTask(title);
});

When(
  'I add a task titled {string} with priority {string}',
  async ({ projectDetailPage }, title: string, priority: string) => {
    await projectDetailPage.createTask(title, {
      priority: priority as 'low' | 'medium' | 'high',
    });
  },
);
```

Edit steps resolve the task title first, then open the form:

```ts
When(
  'I edit the task {string} setting status to {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, status: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await projectDetailPage.openEditTaskForm(resolved);
    await projectDetailPage.taskForm.setStatus(status);
    await projectDetailPage.taskForm.save();
  },
);
```

**Assertion steps** — Then steps assert visible state:

```ts
Then(
  'I see the task {string} in the project',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRow(resolved)).toBeVisible();
  },
);

Then(
  'the task {string} shows status {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, status: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRowStatus(resolved)).toContainText(`status: ${status}`);
  },
);
```

The full set of assertion steps covers: status, priority, assignee, due date, no-due-date, assigned-to-me.

**Assignment step** — uses the current user's `name` from `scenarioWorld`:

```ts
When(
  'I assign the task {string} to myself',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('No current user');
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await projectDetailPage.openEditTaskForm(resolved);
    await projectDetailPage.taskForm.setAssigneeByName(user.name);
    await projectDetailPage.taskForm.save();
  },
);
```

This is one of the payoffs for `seedUser` returning `name` — the step can select the assignee by their display name without hard-coding anything.

### 3. `projects.steps.ts` — data-table seed + task assertions

The data-table seed step in `apps/web-e2e/src/steps/projects.steps.ts` loops through a Gherkin `DataTable` and seeds each row as a task:

```ts
Given(
  'a project {string} seeded via the API for the current user with tasks:',
  async (
    { scenarioWorld, seedProject, seedTask },
    name: string,
    table: DataTable,
  ) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('Login step must run first');
    const project = await seedProject({ ownerId: user.id, name });
    const tasks = [];
    for (const row of table.hashes()) {
      const task = await seedTask({
        projectId: project.id,
        title: row['title'],
        status: row['status'] as 'todo' | 'doing' | 'done',
        priority: row['priority'] as 'low' | 'medium' | 'high',
      });
      tasks.push(task);
    }
    await test.info().attach('seeded-fixture', {
      body: JSON.stringify({ project, tasks }, null, 2),
      contentType: 'application/json',
    });
  },
);
```

The `test.info().attach(...)` call appends the seeded fixture JSON to the Playwright trace and HTML report. When a scenario fails, you can open the report and see exactly what the API returned — no guessing about IDs or names.

The `Then 'I see tasks:'` step does the same resolution per row:

```ts
Then('I see tasks:', async ({ projectDetailPage, scenarioWorld }, table: DataTable) => {
  for (const row of table.hashes()) {
    const resolved =
      scenarioWorld.taskNames.get(row['title'].replace(/^E2E_/, '')) ?? row['title'];
    await expect(projectDetailPage.taskRow(resolved)).toBeVisible();
  }
});
```

### 4. `extra.steps.ts` — utility steps

`apps/web-e2e/src/steps/extra.steps.ts` is a home for steps that span pages, cover one-off interactions, or don't belong to a single page object's natural domain. They are not miscellaneous — each step solves a specific scenario need.

**Ownership steps** — seed a second user and their project, then make their project accessible to subsequent steps via `scenarioWorld.extraProjectId`:

```ts
Given(
  'an E2E admin user owns a project {string}',
  async ({ scenarioWorld, seedUser, seedProject }, projectName: string) => {
    const admin = await seedUser({ role: 'admin', emailPrefix: 'extra_admin' });
    const extras = getExtraUsers(scenarioWorld as { extraUsers?: ExtraUsers });
    extras['extra_admin'] = admin;
    const project = await seedProject({ ownerId: admin.id, name: projectName });
    (scenarioWorld as { extraProjectId?: string }).extraProjectId = project.id;
  },
);

Given(
  'an E2E member user owns a project {string}',
  async ({ scenarioWorld, seedUser, seedProject }, projectName: string) => {
    const owner = await seedUser({ role: 'member', emailPrefix: 'extra_member' });
    const extras = getExtraUsers(scenarioWorld as { extraUsers?: ExtraUsers });
    extras['extra_member'] = owner;
    const project = await seedProject({ ownerId: owner.id, name: projectName });
    (scenarioWorld as { extraProjectId?: string }).extraProjectId = project.id;
  },
);
```

`extraProjectId` is added to the `scenarioWorld` by casting — not every scenario needs it, so it is not in the `ScenarioWorld` type. This is an intentional narrow extension pattern: only the steps that use `extraProjectId` know about it.

**Cross-user navigation** — When steps navigate to another user's project by ID:

```ts
When('I open the admin\'s project', async ({ projectDetailPage, scenarioWorld }) => {
  const projectId = (scenarioWorld as { extraProjectId?: string }).extraProjectId;
  if (!projectId) throw new Error('No extraProjectId — did the admin-seeds-project step run?');
  await projectDetailPage.gotoById(projectId);
});
```

Using `gotoById` bypasses the projects list — the logged-in user might not own this project, so navigating from the list would not find it.

**Search steps:**

```ts
When('I search for {string}', async ({ projectsListPage }, q: string) => {
  await projectsListPage.search(q);
});

Then(
  'I do not see the project {string} in the list',
  async ({ projectsListPage, scenarioWorld }, name: string) => {
    const actual = scenarioWorld.projectNames.get(name) ?? name;
    await expect(projectsListPage.row(actual)).toHaveCount(0);
  },
);

Then('I see the projects empty state', async ({ projectsListPage }) => {
  await expect(projectsListPage.emptyState).toBeVisible();
});
```

**Form validation steps:**

```ts
When(
  'I create a project named {string} with description {string}',
  async ({ projectsListPage }, name: string, description: string) => {
    await projectsListPage.createProject(name, description);
  },
);

Then(
  'the project description reads {string}',
  async ({ projectDetailPage }, text: string) => {
    await expect(projectDetailPage.description).toContainText(text);
  },
);

Then('I see a new-project form error', async ({ projectsListPage }) => {
  await expect(projectsListPage.newFormErrorMatching(/fail|error/i)).toBeVisible();
});
```

**Delete steps:**

```ts
When('I delete the current project', async ({ projectDetailPage }) => {
  await projectDetailPage.deleteProjectWithConfirm();
});

Then('the delete project button is hidden', async ({ projectDetailPage }) => {
  await expect(projectDetailPage.deleteProjectButton).toHaveCount(0);
});
```

### 5. The feature files

#### `list-search.feature` — multi-project seed + search

```gherkin
@projects @module-08
Feature: Project list and search

  Background:
    Given an E2E member is logged in
    And a project "Apollo Rollout" seeded via the API for the current user
    And a project "Beacon Sync" seeded via the API for the current user
    And a project "Cascade Refresh" seeded via the API for the current user

  Scenario: seeded projects appear in the list
    When I visit the projects page
    Then I see the project "Apollo Rollout" in the list
    And I see the project "Beacon Sync" in the list
    And I see the project "Cascade Refresh" in the list

  Scenario: searching narrows the list by name
    When I visit the projects page
    And I search for "Apollo"
    Then I see the project "Apollo Rollout" in the list
    And I do not see the project "Beacon Sync" in the list
    And I do not see the project "Cascade Refresh" in the list

  Scenario: search is case-insensitive
    When I visit the projects page
    And I search for "beacon"
    Then I see the project "Beacon Sync" in the list
    And I do not see the project "Apollo Rollout" in the list

  Scenario: search with no matches shows the empty state
    When I visit the projects page
    And I search for "zzzz_nothing"
    Then I see the projects empty state
```

The Background seeds three distinct projects. Each scenario's projects get unique names via `scenarioId` — `"Apollo Rollout_a1b2c3d4"` for one scenario, `"Apollo Rollout_9f8e7d6c"` for a parallel run. The search scenarios filter by partial name, so they only see each scenario's own rows.

#### `create-validation.feature` — UI creation with description

```gherkin
@projects @module-08
Feature: Create project validation

  Background:
    Given an E2E member is logged in

  Scenario: creating a project with a name succeeds
    When I visit the projects page
    And I create a project named "Typed In Project"
    Then I see the project "Typed In Project" in the list

  Scenario: creating a project with a description succeeds
    When I visit the projects page
    And I create a project named "With Description" with description "A short description"
    Then I see the project "With Description" in the list
    When I open the project "With Description"
    Then the project description reads "A short description"
```

Note that UI-created projects do not go through `seedProject`, so they do not appear in `projectNames`. The `Then I see the project` step's `resolveProjectName` fallback returns `baseName` unchanged — which is what the UI created.

#### `ownership.feature` — role-based delete rules

```gherkin
@projects @module-08
Feature: Project ownership rules

  Scenario: owner can delete their own project
    Given an E2E member is logged in
    And a project "Owner Deletes" seeded via the API for the current user
    When I visit the projects page
    And I open the project "Owner Deletes"
    And I delete the current project
    Then I am on the projects page
    And I do not see the project "Owner Deletes" in the list

  Scenario: non-owner member does not see the delete button
    Given an E2E admin user owns a project "Admins Project"
    And an E2E member is logged in
    When I open the admin's project
    Then the delete project button is hidden

  Scenario: admin can delete any project
    Given an E2E member user owns a project "Members Project"
    And an E2E admin is logged in
    When I open the member's project
    And I delete the current project
    Then I am on the projects page
```

The ownership scenarios do not share a Background. Each scenario seeds its own users and projects independently — no shared state, no ordering dependencies.

#### `task-crud.feature` — add/edit/delete via UI

```gherkin
@tasks @module-08
Feature: Task CRUD

  Background:
    Given an E2E member is logged in
    And a project "Task CRUD Project" seeded via the API for the current user

  Scenario: add a task with just a title
    When I open the project "Task CRUD Project"
    And I add a task titled "Draft the brief"
    Then I see the task "Draft the brief" in the project

  Scenario: add a task with priority high
    When I open the project "Task CRUD Project"
    And I add a task titled "Urgent item" with priority "high"
    Then I see the task "Urgent item" in the project
    And the task "Urgent item" shows priority "high"

  Scenario: edit a task's status
    Given a task "E2E_Change Status" in "Task CRUD Project" with status "todo"
    When I open the project "Task CRUD Project"
    And I edit the task "E2E_Change Status" setting status to "done"
    Then the task "E2E_Change Status" shows status "done"

  Scenario: edit a task's priority
    Given a task "E2E_Change Priority" in "Task CRUD Project" with priority "low"
    When I open the project "Task CRUD Project"
    And I edit the task "E2E_Change Priority" setting priority to "high"
    Then the task "E2E_Change Priority" shows priority "high"

  Scenario: delete a task
    Given a task "E2E_To Be Deleted" in "Task CRUD Project" with status "todo"
    When I open the project "Task CRUD Project"
    And I delete the task "E2E_To Be Deleted"
    Then I do not see the task "E2E_To Be Deleted" in the project
```

The add-task scenarios test the UI creation path — no precondition task exists, so you must go through the form. The edit and delete scenarios seed the task first so the UI interaction (editing, deleting) is what's under test, not the creation.

#### `task-filter.feature` — status filter with bulk seed

```gherkin
@tasks @module-08
Feature: Filter tasks by status

  Background:
    Given an E2E member is logged in
    And a project "Filter Project" seeded via the API for the current user with tasks:
      | title      | status | priority |
      | Plan       | todo   | medium   |
      | Execute    | doing  | high     |
      | Review     | done   | low      |
      | Retrospect | done   | medium   |

  Scenario: all tasks are visible by default
    When I open the project "Filter Project"
    Then I see tasks:
      | title          |
      | E2E_Plan       |
      | E2E_Execute    |
      | E2E_Review     |
      | E2E_Retrospect |

  Scenario: filtering by "todo" hides non-todo tasks
    When I open the project "Filter Project"
    And I filter tasks by status "todo"
    Then I see tasks:
      | title    |
      | E2E_Plan |
    And I do not see the task "E2E_Execute" in the project

  Scenario: filtering by "doing" shows only in-flight tasks
    When I open the project "Filter Project"
    And I filter tasks by status "doing"
    Then I see tasks:
      | title       |
      | E2E_Execute |
    And I do not see the task "E2E_Plan" in the project

  Scenario: filtering by "done" shows completed tasks
    When I open the project "Filter Project"
    And I filter tasks by status "done"
    Then I see tasks:
      | title          |
      | E2E_Review     |
      | E2E_Retrospect |
```

This feature shows the data-table seed pattern at its best. The Background creates four tasks with specific statuses in one step. Each filter scenario navigates to the project and exercises the status filter dropdown — the interesting behaviour. None of the filter scenarios waste time on setup.

Note that `Then I see tasks:` accepts `E2E_`-prefixed titles in the data table. The step strips `E2E_` before looking up in `taskNames`, which then resolves to the full unique name including `scenarioId`.

#### `task-assignee.feature` — assignment via UI

```gherkin
@tasks @module-08
Feature: Task assignment

  Background:
    Given an E2E member is logged in
    And a project "Assignment Project" seeded via the API for the current user

  Scenario: unassigned task shows the unassigned label
    Given a task "E2E_No Owner" in "Assignment Project" with status "todo"
    When I open the project "Assignment Project"
    Then the task "E2E_No Owner" shows assignee "unassigned"

  Scenario: assigning a task to the current user via UI
    Given a task "E2E_Assign Me" in "Assignment Project" with status "todo"
    When I open the project "Assignment Project"
    And I assign the task "E2E_Assign Me" to myself
    Then the task "E2E_Assign Me" is assigned to me
```

The "assigned to me" assertion uses `user.name` from `scenarioWorld.seededUser` — it knows the current user's display name without any hard-coding.

## Exercise

1. Add a new scenario to `task-crud.feature` that seeds a task with `priority "low"`, opens the project, edits the task to set priority to `"high"`, and asserts the new priority appears. Run it in isolation with `--grep "edit a task's priority"` to confirm it passes.

2. Add a `task-due-dates.feature` under `features/tasks/` tagged `@module-08`. It should:
   - Seed a project and a task via the API (no due date).
   - Open the project, edit the task to set due date `"2030-12-31"`.
   - Assert the due date appears.
   - Edit the task again to clear the due date.
   - Assert the due date element is gone.
   
   Hint: `TaskForm` already has `setDueDate` and `clearDueDate`. The `Then` steps you need are in `tasks.steps.ts`.

## Run it

```bash
npm run e2e -- --grep @module-08
```

## Compare

```bash
git diff 08-complete -- apps/web-e2e
```

## Cheat sheet

**Task resolution flow:**

```
feature file: "E2E_Change Status"
         ↓  strip E2E_ prefix → "Change Status"
         ↓  seedTask fixture: "Change Status_a1b2c3d4"
         ↓  API: "E2E_Change Status_a1b2c3d4"
world.taskNames: "Change Status" → "E2E_Change Status_a1b2c3d4"
         ↓  resolveTaskTitle(world, "E2E_Change Status")
locator: projectDetailPage.taskRow("E2E_Change Status_a1b2c3d4")
```

**TaskForm method summary:**

| Method | When to use |
|---|---|
| `create()` | After filling the add-task form |
| `save()` | After editing an existing task |
| `deleteWithConfirm()` | Deletes and accepts the dialog |
| `setStatus(s)` | Select status in edit form |
| `setPriority(p)` | Select priority in edit form |
| `setAssigneeByName(n)` | Select assignee by display name |
| `setDueDate(iso)` | Set due date (ISO string) |
| `clearDueDate()` | Clear the due date input |

**When should a step live in `extra.steps.ts` vs `tasks.steps.ts` vs `projects.steps.ts`?**

- Put it in the file whose page object(s) it primarily uses.
- Steps that manipulate `usersListPage`, `userDetailPage`, or `profilePage` go in `extra.steps.ts`.
- Steps that navigate to another user's project by ID (cross-ownership) go in `extra.steps.ts`.
- Steps that seed a non-current user go in `extra.steps.ts`.
- Everything task-specific goes in `tasks.steps.ts`.
- Everything project-specific (list, open, create, seed) goes in `projects.steps.ts`.

## Next

→ [Module 09 — Users + isolation proof](../09-users-isolation/README.md)
