# Module 07 — The /test seam + seed fixtures

**Estimated time: 35–45 min**

## Files you'll create / touch

| File | What happens |
|---|---|
| `apps/api/src/test/test.controller.ts` | Four env-guarded endpoints (conceptual — already in the repo) |
| `apps/api/src/test/test.service.ts` | Prisma logic behind each endpoint |
| `apps/api/src/test/test.module.ts` | NestJS module wiring |
| `apps/api/src/test/dto/seed-user.dto.ts` | DTO for `POST /test/seed/user` |
| `apps/api/src/test/dto/seed-project.dto.ts` | DTO for `POST /test/seed/project` |
| `apps/api/src/test/dto/seed-task.dto.ts` | DTO for `POST /test/seed/task` |
| `apps/web-e2e/src/support/api-client.ts` | Typed `apiRequest` helper |
| `apps/web-e2e/src/support/seed/index.ts` | Typed seed helpers wrapping the endpoints |
| `apps/web-e2e/src/fixtures/test.ts` | `seedUser`, `seedProject`, `seedTask` fixtures + `scenarioWorld` cleanup |
| `apps/web-e2e/src/steps/auth-session.steps.ts` | Add `an E2E member is logged in` step |
| `apps/web-e2e/src/pages/projects-list-page.ts` | Full locator map + `row()`, `openProject()`, `createProject()` |
| `apps/web-e2e/src/pages/project-detail-page.ts` | Full locator map + task interaction methods |
| `apps/web-e2e/src/steps/projects.steps.ts` | Seed steps + `resolveProjectName` usage |
| `apps/web-e2e/src/features/projects/project-crud.feature` | Signature `@module-07` scenario |

---

## What you'll learn

- What the `/test/*` seam is and why it only exists when `NODE_ENV !== 'production'`
- How to call it from your test suite via a typed `apiRequest` helper
- How `seedUser`, `seedProject`, and `seedTask` Playwright fixtures wrap those endpoints
- How `scenarioId` keeps parallel workers from colliding
- How `resolveProjectName` bridges the human-readable feature name to the unique DB name
- The core "seed via API, assert via UI" pattern in practice

## Why it matters

This is the foundational module for everything that follows. Every project and task scenario you will write for the rest of the workshop leans on what you build here.

The alternative — creating all test data through the UI — sounds simple until you run into it:

- **Slow.** Clicking through a creation form takes 2–4 seconds of real browser time. An API call takes 30 ms.
- **Flaky.** If the UI's form changes, your setup steps break even though the thing being tested hasn't changed.
- **Unparallelizable.** If two workers both try to create a project named "My Project" you get collisions, or worse, silent data corruption between tests.

The `/test/*` seam gives you a stable, fast, typed escape hatch: you assert that the API did what it was supposed to in other tests. In E2E tests, it is a precondition mechanism, not the thing under test.

## Prerequisites

- Module 06 complete
- `git checkout 07-start`

## Walkthrough

### 1. Two seeds, two purposes

Before touching any test code, understand the split:

**Dev seed** (`apps/api/prisma/seed.ts`) — creates `admin@example.com`, `alice@example.com`, `bob@example.com`. Runs on `nx serve api` via the `prisma-seed` target. These users exist for developer convenience when poking around the running app.

**E2E seed** — created on demand, per scenario, through the `/test/*` endpoints. Always `E2E_`-prefixed. Never left behind.

E2E tests must never touch dev-seed users and must never leave data behind. That contract is not convention — it is what makes the suite parallelizable.

### 2. The `/test/*` seam — the API side

`apps/api/src/test/test.controller.ts` exposes four endpoints:

```ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TestService } from './test.service';
import { SeedUserDto } from './dto/seed-user.dto';
import { SeedProjectDto } from './dto/seed-project.dto';
import { SeedTaskDto } from './dto/seed-task.dto';

@Controller('test')
export class TestController {
  constructor(private readonly test: TestService) {}

  @Post('seed/user')
  seedUser(@Body() dto: SeedUserDto) {
    return this.test.seedUser(dto);
  }

  @Post('seed/project')
  seedProject(@Body() dto: SeedProjectDto) {
    return this.test.seedProject(dto);
  }

  @Post('seed/task')
  seedTask(@Body() dto: SeedTaskDto) {
    return this.test.seedTask(dto);
  }

  @Post('reset')
  @HttpCode(204)
  async reset() {
    await this.test.reset();
  }
}
```

The controller is deliberately thin. All logic lives in `TestService`. The route is registered only when `NODE_ENV !== 'production'` — that guard lives in `app.module.ts`, where `TestModule` is conditionally imported.

The DTOs constrain what callers can pass. Look at each:

**`dto/seed-user.dto.ts`** — role is optional (defaults to `member`), emailPrefix is optional (server generates a random one):

```ts
import { IsIn, IsOptional, IsString } from 'class-validator';

export class SeedUserDto {
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member';

  @IsOptional()
  @IsString()
  emailPrefix?: string;
}
```

**`dto/seed-project.dto.ts`** — `ownerId` is required; name and description are optional:

```ts
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SeedProjectDto {
  @IsString()
  @MinLength(1)
  ownerId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

**`dto/seed-task.dto.ts`** — `projectId` is required; everything else optional, with validated enums for status and priority:

```ts
import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SeedTaskDto {
  @IsString()
  @MinLength(1)
  projectId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'doing', 'done'])
  status?: 'todo' | 'doing' | 'done';

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}
```

### 3. The service — what actually runs

`apps/api/src/test/test.service.ts` has two helper functions that enforce the `E2E_` prefix contract:

```ts
const E2E = 'E2E_';

function ensurePrefix(value: string | undefined, fallback: string): string {
  const raw = value ?? fallback;
  return raw.startsWith(E2E) ? raw : `${E2E}${raw}`;
}

function randomSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
```

`ensurePrefix` means you can pass `"My Project"` from the fixture and it becomes `"E2E_My Project"` in the database. If you already passed `"E2E_My Project"`, it stays as-is — no double-prefix.

`seedUser` returns the plaintext password alongside the JWT. That means your steps can log in through the UI if they need to, without knowing or hard-coding the password:

```ts
async seedUser(dto: SeedUserDto) {
  const prefix = dto.emailPrefix ?? `user_${randomSuffix()}`;
  const email = `${E2E}${prefix}@example.com`;
  const password = 'E2EPass1!';
  const passwordHash = await bcrypt.hash(password, 10);
  const name = `E2E ${prefix}`;
  const role = dto.role ?? 'member';
  const user = await this.prisma.user.create({
    data: { email, passwordHash, name, role },
  });
  const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
  return { id: user.id, email: user.email, password, token, role: user.role, name: user.name };
}
```

`reset()` sweeps via three cascading deletes — tasks first, then projects, then users — matching anything `E2E_`-prefixed anywhere in the ownership chain:

```ts
async reset() {
  await this.prisma.task.deleteMany({
    where: {
      OR: [
        { title: { startsWith: E2E } },
        { project: { name: { startsWith: E2E } } },
        { project: { owner: { email: { startsWith: E2E } } } },
        { assignee: { email: { startsWith: E2E } } },
      ],
    },
  });
  await this.prisma.project.deleteMany({
    where: {
      OR: [
        { name: { startsWith: E2E } },
        { owner: { email: { startsWith: E2E } } },
      ],
    },
  });
  await this.prisma.user.deleteMany({ where: { email: { startsWith: E2E } } });
}
```

The cascade order matters: foreign key constraints on tasks require tasks to be deleted before their parent projects.

### 4. The NestJS module wiring

`apps/api/src/test/test.module.ts` imports `JwtModule` so `TestService` can mint tokens in `seedUser`. Note that it re-reads the same environment variables as the main auth module — same secret, same expiry:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TestController } from './test.controller';
import { TestService } from './test.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'changeme',
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as never },
      }),
    }),
  ],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
```

Because both modules use the same `JWT_SECRET`, a token minted by `seedUser` is accepted by `AuthGuard` on any protected route without any extra configuration.

### 5. `api-client.ts` — the E2E side of the seam

`apps/web-e2e/src/support/api-client.ts` is a single typed function that every seed helper and every step that makes direct API calls goes through:

```ts
import { E2E_API_BASE_URL } from './env';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${E2E_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  const payload = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? Array.isArray((payload as { message: unknown }).message)
          ? (payload as { message: string[] }).message.join(', ')
          : String((payload as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiClientError(res.status, msg, payload);
  }

  return payload as T;
}
```

Three things to notice:

- `E2E_API_BASE_URL` defaults to `http://localhost:3000` via `support/env.ts` — configurable via environment variable for CI.
- The `204` short-circuit prevents `res.json()` on an empty body (the reset endpoint returns 204).
- `ApiClientError` includes the raw `payload` so failing steps get actionable error messages, not just a status code.

### 6. `seed/index.ts` — typed wrappers

`apps/web-e2e/src/support/seed/index.ts` wraps each endpoint so callers work with typed objects, not raw `fetch`:

```ts
export const seed = {
  user(input: SeedUserInput = {}): Promise<SeededUser> {
    return apiRequest<SeededUser>('/test/seed/user', { method: 'POST', body: input });
  },

  project(input: SeedProjectInput): Promise<SeededProject> {
    return apiRequest<SeededProject>('/test/seed/project', { method: 'POST', body: input });
  },

  task(input: SeedTaskInput): Promise<SeededTask> {
    return apiRequest<SeededTask>('/test/seed/task', { method: 'POST', body: input });
  },

  async projectWithTasks(input: {
    owner: SeededUser;
    name?: string;
    tasks?: Array<Omit<SeedTaskInput, 'projectId'>>;
  }): Promise<{ project: SeededProject; tasks: SeededTask[] }> {
    const project = await seed.project({ ownerId: input.owner.id, name: input.name });
    const tasks: SeededTask[] = [];
    for (const t of input.tasks ?? []) {
      tasks.push(await seed.task({ projectId: project.id, ...t }));
    }
    return { project, tasks };
  },

  reset(): Promise<void> {
    return apiRequest<void>('/test/reset', { method: 'POST' });
  },
};
```

`projectWithTasks` is a convenience compositor for the common case of seeding a project and several tasks in one call. It loops sequentially — each `seed.task` call must complete before the next to avoid any race on `projectId`.

The exported types (`SeededUser`, `SeededProject`, `SeededTask`) are what flow into `ScenarioWorld` and into fixture signatures, so TypeScript enforces that steps can only access fields the API actually returns.

### 7. Seed fixtures and the `scenarioWorld` — the glue

`apps/web-e2e/src/fixtures/test.ts` is where the raw `seed.*` functions become Playwright fixtures. Every scenario gets its own `scenarioWorld` with a fresh `scenarioId`, and every ID created during that scenario gets pushed into the world's tracking arrays.

First, the `ScenarioWorld` type:

```ts
type ScenarioWorld = {
  scenarioId: string;
  seededUser?: SeededUser;
  seededProject?: SeededProject;
  createdUserIds: string[];
  createdProjectIds: string[];
  createdTaskIds: string[];
  projectNames: Map<string, string>;
  taskNames: Map<string, string>;
};
```

`projectNames` is a `Map<baseName, actualDbName>` — the bridge between what the feature file says (`"First Client Launch"`) and what actually went into the database (`"E2E_First Client Launch_a1b2c3d4"`).

The `scenarioWorld` fixture itself:

```ts
scenarioWorld: async ({}, use) => {
  const world: ScenarioWorld = {
    scenarioId: randomBytes(4).toString('hex'),
    createdUserIds: [],
    createdProjectIds: [],
    createdTaskIds: [],
    projectNames: new Map(),
    taskNames: new Map(),
  };
  await use(world);
  for (const id of world.createdTaskIds) {
    try {
      await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    } catch {
      // globalTeardown sweeps E2E_ data as belt-and-suspenders
    }
  }
  for (const id of world.createdProjectIds) {
    try {
      await apiRequest(`/projects/${id}`, { method: 'DELETE' });
    } catch {
      // ditto
    }
  }
},
```

Everything after `await use(world)` is the teardown — Playwright's equivalent of an `After` hook. The `try/catch` is intentional: if a project was already deleted by the scenario itself (e.g., an ownership test), the cleanup should not fail the test.

Notice that `createdUserIds` is tracked but not deleted in the per-scenario teardown. Users are swept by `globalTeardown`'s `/test/reset`. This is fine because user emails are always `E2E_`-prefixed.

The `seedProject` fixture shows the uniqueness trick:

```ts
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

The feature file passes `"First Client Launch"`. The fixture appends `_a1b2c3d4` (the scenario's 4-byte hex ID). The API receives `"First Client Launch_a1b2c3d4"`, prefixes it with `E2E_`, and stores `"E2E_First Client Launch_a1b2c3d4"`. Then `projectNames.set("First Client Launch", "E2E_First Client Launch_a1b2c3d4")` records the mapping so steps can look it up.

`seedTask` does the same for task titles, and also records the final `E2E_`-prefixed title in `taskNames`:

```ts
seedTask: async ({ scenarioWorld }, use) => {
  await use(async (input) => {
    const baseTitle = input.title ?? 'task';
    const uniqueTitle = `${baseTitle}_${scenarioWorld.scenarioId}`;
    const t = await seed.task({ ...input, title: uniqueTitle });
    scenarioWorld.createdTaskIds.push(t.id);
    scenarioWorld.taskNames.set(baseTitle, `E2E_${uniqueTitle}`);
    return t;
  });
},
```

### 8. `auth-session.steps.ts` — the `an E2E member is logged in` step

This step was deliberately held out of Module 06 because it depends on `seedUser`, which wasn't a fixture yet. Now it can be added:

```ts
Given('an E2E member is logged in', async ({ session, scenarioWorld, seedUser }) => {
  const user = await seedUser({ role: 'member' });
  scenarioWorld.seededUser = user;
  await session.setStoredAuth(user);
});
```

It seeds a fresh E2E user, stores their token in `scenarioWorld.seededUser` (so later steps can reference `user.id` and `user.name`), then injects the stored auth state into the browser context via `session.setStoredAuth`. The scenario starts already authenticated — no UI login required.

### 9. Page objects — `ProjectsListPage` and `ProjectDetailPage`

`apps/web-e2e/src/pages/projects-list-page.ts` exposes the full locator map for the projects list:

```ts
export class ProjectsListPage extends BasePage {
  readonly heading: Locator;
  readonly newProjectButton: Locator;
  readonly searchInput: Locator;
  readonly list: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly newForm: Locator;
  readonly newFormNameInput: Locator;
  readonly newFormDescriptionInput: Locator;
  readonly newFormSubmitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Projects' });
    this.newProjectButton = page.getByRole('button', { name: 'New project' });
    this.searchInput = page.getByLabel('Search projects');
    this.list = page.getByTestId('projects-list');
    this.emptyState = page.getByTestId('projects-list-empty-state');
    this.errorMessage = page.getByTestId('projects-list-error');
    this.loadingIndicator = page.getByTestId('projects-list-loading');
    this.newForm = page.getByTestId('project-new-form');
    this.newFormNameInput = this.newForm.getByLabel('Name');
    this.newFormDescriptionInput = this.newForm.getByLabel('Description');
    this.newFormSubmitButton = this.newForm.getByRole('button', { name: 'Create' });
  }
```

The `row` method uses a scope-and-filter pattern — it scopes to the `projects-list` container and then filters by text:

```ts
  row(name: string): Locator {
    return this.list.getByTestId('projects-list-item').filter({ hasText: name });
  }
```

This is the locator strategy in action: no dynamic IDs baked into test-IDs. You select by the content you can see, scoped to the container you're working in.

`apps/web-e2e/src/pages/project-detail-page.ts` adds locators for task rows and the embedded `TaskForm`:

```ts
export class ProjectDetailPage extends BasePage {
  readonly name: Locator;
  readonly description: Locator;
  readonly addTaskButton: Locator;
  readonly statusFilter: Locator;
  readonly tasksList: Locator;
  readonly tasksEmptyState: Locator;
  readonly deleteProjectButton: Locator;
  readonly taskForm: TaskForm;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('project-detail-name');
    this.description = page.getByTestId('project-detail-description');
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
    this.statusFilter = page.getByLabel('Status');
    this.tasksList = page.getByTestId('tasks-list');
    this.tasksEmptyState = page.getByTestId('project-detail-tasks-empty-state');
    this.deleteProjectButton = page.getByRole('button', { name: 'Delete project' });
    this.taskForm = new TaskForm(page);
  }
```

`taskRow(title)` uses the same scope-and-filter pattern as `projectsListPage.row`:

```ts
  taskRow(title: string): Locator {
    return this.tasksList.getByTestId('task-row').filter({ hasText: title });
  }
```

### 10. `projects.steps.ts` — using `resolveProjectName`

`apps/web-e2e/src/steps/projects.steps.ts` wires the seed steps and uses `resolveProjectName` to bridge feature-file names to actual DB names:

```ts
Given(
  'a project {string} seeded via the API for the current user',
  async ({ scenarioWorld, seedProject }, name: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('Login step must run first');
    await seedProject({ ownerId: user.id, name });
  },
);

When(
  'I open the project {string}',
  async ({ projectsListPage, scenarioWorld }, name: string) => {
    const actual = resolveProjectName(scenarioWorld, name);
    await projectsListPage.goto();
    await projectsListPage.openProject(actual);
  },
);

Then(
  'I see the project {string} in the list',
  async ({ projectsListPage, scenarioWorld }, name: string) => {
    const actual = resolveProjectName(scenarioWorld, name);
    await expect(projectsListPage.row(actual)).toBeVisible();
  },
);
```

`resolveProjectName` is exported from `fixtures/test.ts` (not from a steps file) so any step file can import it without creating a circular dependency:

```ts
export function resolveProjectName(world: ScenarioWorld, baseName: string): string {
  return world.projectNames.get(baseName) ?? baseName;
}
```

The fallback to `baseName` means non-seeded project names (e.g., something created via the UI) still work — you just pass the raw name.

### 11. The signature scenario

`apps/web-e2e/src/features/projects/project-crud.feature`:

```gherkin
@projects @module-07
Feature: Project CRUD (API seed + UI assert)

  Background:
    Given an E2E member is logged in

  @smoke
  Scenario: the user's seeded project appears in the list
    Given a project "First Client Launch" seeded via the API for the current user
    When I visit the projects page
    Then I see the project "First Client Launch" in the list
```

The `Given` lines take milliseconds — one API call each. The `When`/`Then` exercises the real React UI. The background step seeds a fresh user and logs them in through stored auth. The whole scenario runs in under a second.

Note that `project-crud.feature` is tagged `@module-07` at the feature level, but the smoke scenario also carries `@smoke` so you can run just the fastest confirming test with `--grep @smoke`.

## Exercise

Write a new scenario in `project-crud.feature` that:

1. Seeds a project via the API.
2. Opens it via the UI.
3. Asserts the project name is visible on the detail page (use `projectDetailPage.name`).

Then extend it: seed that project with two tasks in the `Given` step using the data-table syntax (copy from the `seed a project with a data table of tasks` scenario). Assert both tasks appear in the detail view.

Bonus: call `apiRequest` directly in a `Then` step to verify the project actually exists in the API before you assert the UI. Compare what the API response contains with what the `SeededProject` type says.

## Run it

```bash
npm run e2e -- --grep @module-07
```

## Compare

```bash
git diff 07-complete -- apps/web-e2e
```

## Cheat sheet

**The seed → world → resolve flow:**

```
feature file: "First Client Launch"
         ↓  seedProject fixture
world.projectNames: "First Client Launch" → "E2E_First Client Launch_a1b2c3d4"
         ↓  resolveProjectName(world, name)
locator:   projectsListPage.row("E2E_First Client Launch_a1b2c3d4")
```

**Endpoint summary:**

| Method | Path | Auth required | Returns |
|---|---|---|---|
| POST | `/test/seed/user` | None | `{id, email, password, token, role, name}` |
| POST | `/test/seed/project` | None | `{id, name, ownerId}` |
| POST | `/test/seed/task` | None | `{id}` |
| POST | `/test/reset` | None | 204 empty |

**Cleanup hierarchy:**

1. Per-scenario fixture teardown: deletes tracked task IDs, then project IDs (tasks first due to FK constraints)
2. `globalTeardown` `/test/reset`: sweeps all `E2E_`-prefixed rows — catches anything that crashed before teardown

**Decision table — seed via API or UI?**

| Situation | Approach |
|---|---|
| Precondition: user already has a project | API seed |
| The feature under test: project creation form | UI |
| Precondition: task with specific status/priority | API seed |
| The feature under test: task creation dialog | UI |

## Next

→ [Module 08 — Projects & tasks with the hybrid pattern](../08-projects-tasks-hybrid/README.md)
