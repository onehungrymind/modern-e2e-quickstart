# Module 05 — Storage state: log in once

**Estimated time:** 30–40 min

## Files you'll create / touch

| File | What changes |
|---|---|
| `apps/web-e2e/src/support/env.ts` | New — base URLs, role constants, `storageStatePath` helper |
| `apps/web-e2e/src/support/seed/index.ts` | New — typed seed functions (`user`, `project`, `task`, `projectWithTasks`, `reset`) |
| `apps/web-e2e/src/support/global-setup.ts` | New — logs in once per role, writes `.auth/<role>.json` |
| `apps/web-e2e/src/support/global-teardown.ts` | New — calls `/test/reset` after the suite |
| `apps/web-e2e/playwright.config.ts` | Add `testDir`, `globalSetup`, `globalTeardown` |
| `.env` / `.env.example` | Pin `JWT_SECRET` |

This module has **no `@module-05` tagged scenarios**. Its deliverable is the three `.auth/*.json` files that Module 06 consumes.

---

## What you'll learn

- What `storageState` is: a serialized snapshot of a browser context (cookies + localStorage)
- Why logging in once per role is faster than logging in per scenario
- How `globalSetup` and `globalTeardown` bracket the entire test suite
- How to write a typed seed library that talks to env-guarded test endpoints
- Why pinning `JWT_SECRET` is not optional

## Why it matters

Every scenario that starts with "log in via the form" pays 500ms–1s for the network round trip, DOM rendering, and navigation. With 30 scenarios that's up to 30 seconds of noise. More importantly, it makes every failing test harder to read: the broken step is buried under four login-preamble steps.

`storageState` solves this cleanly. Playwright can serialize a browser context — cookies, localStorage, sessionStorage — to a JSON file. Load that file into a fresh context and the app sees an already-authenticated user. No form. No redirect. No preamble.

`globalSetup` gives you a single place to run that login once, before any test worker starts. `globalTeardown` gives you a guaranteed cleanup slot after every worker finishes. Together they bracket the entire run.

---

## Prerequisites

- Module 04 complete
- `git checkout 05-start`

---

## Walkthrough

### 1. Pin `JWT_SECRET` in `.env` and `.env.example`

The first thing to understand: stored auth tokens are JWTs. If the server's signing key changes between runs, every cached token becomes invalid and your stored state is stale. The fix is to pin the key to a known value in dev.

`.env` (actual local values — gitignored):

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-not-secret-pin-for-local-do-not-use-in-production"
JWT_EXPIRES_IN="1d"
PORT=3000
NODE_ENV=development

VITE_API_BASE_URL="http://localhost:3000"

E2E_BASE_URL="http://localhost:4200"
E2E_API_BASE_URL="http://localhost:3000"
```

`.env.example` (committed, documents intent):

```
# API
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-not-secret-pin-for-local-do-not-use-in-production"
JWT_EXPIRES_IN="1d"
PORT=3000
NODE_ENV=development

# Web
VITE_API_BASE_URL="http://localhost:3000"

# E2E
E2E_BASE_URL="http://localhost:4200"
E2E_API_BASE_URL="http://localhost:3000"
```

The `playwright.config.ts` hard-codes the same `JWT_SECRET` value in the `webServer.env` block (covered in step 5). This means the dev server started by Playwright uses the pinned key even when the `.env` file isn't loaded by that process.

The NestJS `AuthModule` reads `process.env.JWT_SECRET`. With both the server and the stored tokens using the same key, sessions survive between re-runs.

---

### 2. Create `apps/web-e2e/src/support/env.ts`

This file is the single source of truth for every environment-level constant the E2E suite uses. Nothing else hardcodes URLs or role lists.

```ts
export const E2E_WEB_BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';
export const E2E_API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000';

export const E2E_PASSWORD = 'E2EPass1!';
export const E2E_PREFIX = 'E2E_';

export const ROLES = ['admin', 'alice', 'bob'] as const;
export type E2ERole = (typeof ROLES)[number];

export function storageStatePath(role: E2ERole): string {
  return `${__dirname}/../../.auth/${role}.json`;
}
```

Key design decisions:

- **`ROLES as const`** — the array is a tuple literal, so `E2ERole` is the union `'admin' | 'alice' | 'bob'` and TypeScript will reject typos like `'Admin'` at compile time.
- **`storageStatePath`** — one function, one place. `globalSetup` writes to it, `session.ts` reads from it. If you change the directory, you change it here.
- **`E2E_PASSWORD`** — all E2E-created users share this password. The seed endpoint sets it when creating a user. Centralizing it here means tests never embed a magic string.
- **`E2E_PREFIX`** — reminder constant for the naming convention. The seed endpoints enforce `E2E_` prefixes on emails and names so the belt-and-suspenders `/test/reset` sweep can identify and delete them.

---

### 3. Create `apps/web-e2e/src/support/seed/index.ts`

The seed library is a typed client over the four test endpoints the API exposes:

```ts
import { apiRequest } from '../api-client';

export type SeededUser = {
  id: string;
  email: string;
  password: string;
  token: string;
  role: string;
  name: string;
};

export type SeededProject = {
  id: string;
  name: string;
  ownerId: string;
};

export type SeededTask = {
  id: string;
};

type SeedUserInput = {
  role?: 'admin' | 'member';
  emailPrefix?: string;
};

type SeedProjectInput = {
  ownerId: string;
  name?: string;
  description?: string;
};

type SeedTaskInput = {
  projectId: string;
  title?: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assigneeId?: string;
};

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

Why the full file belongs in this module even though some methods are only used later:

- `globalSetup` calls `seed.reset()` and `seed.user()` — the module can't run without them.
- `globalTeardown` calls `seed.reset()`.
- Splitting the file across modules would require teaching partial files, which is harder to reason about than a complete, consistent object.

The `SeededUser` type deserves attention: it includes `password` in the response. The API seed endpoint creates the user with `E2E_PASSWORD` and echoes it back, so callers don't need to remember the constant. The `token` field is a pre-generated JWT for that user — useful in later modules when you need to make authenticated API calls without going through the browser at all.

`projectWithTasks` is a convenience composer. It calls `seed.project()` then iterates `seed.task()` for each task spec, wiring the `projectId` automatically. The return value bundles both `project` and `tasks` so callers get a single object with everything they need.

The `apiRequest` function comes from `apps/web-e2e/src/support/api-client.ts` (introduced in Module 03). It reads `E2E_API_BASE_URL` from `env.ts`, adds appropriate headers, and throws an `ApiClientError` on non-2xx responses. The seed library sits on top of it rather than calling `fetch` directly, so error messages stay consistent.

---

### 4. Create `apps/web-e2e/src/support/global-setup.ts`

```ts
import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { seed } from './seed';
import { E2E_WEB_BASE_URL, ROLES, storageStatePath } from './env';

export default async function globalSetup(_config: FullConfig) {
  console.log('[globalSetup] starting');
  const authDir = path.resolve(__dirname, '../../.auth');
  fs.mkdirSync(authDir, { recursive: true });

  await seed.reset();
  console.log('[globalSetup] reset complete, seeding baseline users...');

  const browser = await chromium.launch();
  try {
    for (const role of ROLES) {
      const user = await seed.user({
        role: role === 'admin' ? 'admin' : 'member',
        emailPrefix: `baseline_${role}`,
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${E2E_WEB_BASE_URL}/login`);
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(user.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('**/projects');

      const state = await context.storageState();
      const stateWithMeta = {
        ...state,
        _meta: { role, userId: user.id, email: user.email, name: user.name },
      };
      fs.writeFileSync(storageStatePath(role), JSON.stringify(stateWithMeta, null, 2));

      await context.close();
    }
  } finally {
    await browser.close();
  }
}
```

Walk through what happens in order:

1. **`mkdirSync(authDir, { recursive: true })`** — creates `apps/web-e2e/.auth/` if it doesn't exist. The `recursive: true` means it's safe to call on every run even if the directory is already there.

2. **`seed.reset()`** — calls `POST /test/reset` which deletes every row with an `E2E_` prefix from the database. This ensures `globalSetup` always starts from a clean state, even if a previous run crashed before `globalTeardown` could clean up.

3. **`chromium.launch()`** — a raw browser instance, not a Playwright `test` fixture. `globalSetup` runs outside the test runner context, so it can't use `test`-scoped fixtures. It drives the browser directly.

4. **`for (const role of ROLES)`** — iterates `['admin', 'alice', 'bob']`. For each role it:
   - Seeds a user via `POST /test/seed/user`. The `emailPrefix` becomes part of the email: `E2E_baseline_admin@example.com`. The `E2E_` prefix ensures the belt-and-suspenders reset sweep picks it up.
   - Creates a **fresh context** per role. Contexts are isolated: cookies and localStorage in one context don't bleed into another.
   - Navigates to `/login`, fills the form, and clicks Sign in.
   - Waits for the URL to become `**/projects` — proof that authentication succeeded.
   - Calls `context.storageState()` which serializes cookies and localStorage into a plain object.

5. **`stateWithMeta`** — the state object is extended with a `_meta` field containing the role, user ID, email, and name. This is purely for human debugging: open `admin.json` and you can immediately tell which user it represents without decoding the JWT.

6. **`fs.writeFileSync(storageStatePath(role), ...)`** — writes the serialized state to `.auth/admin.json`, `.auth/alice.json`, or `.auth/bob.json`. JSON.stringify with indent 2 makes the files human-readable.

7. **`finally { browser.close() }`** — the `try/finally` guarantees the browser closes even if one of the logins throws. Without this, a failed seed call would leave a Chromium process running.

---

### 5. Create `apps/web-e2e/src/support/global-teardown.ts`

```ts
import type { FullConfig } from '@playwright/test';
import { seed } from './seed';

export default async function globalTeardown(_config: FullConfig) {
  try {
    await seed.reset();
  } catch (err) {
    console.warn('[globalTeardown] /test/reset failed (api may be down):', err);
  }
}
```

This is intentionally small. It calls `seed.reset()` to sweep any E2E data that scenario `After` hooks missed — for example, if a worker process crashed mid-scenario. The `try/catch` is deliberate: if the API is already down by the time teardown runs, the warning is informational and teardown still exits cleanly. The runner should not fail because of a teardown warning.

---

### 6. Wire `playwright.config.ts`

Three additions to the config:

```ts
import * as path from 'node:path';

// at the top, after defineBddConfig():
const testDir = defineBddConfig({ ... });

export default defineConfig({
  testDir,                  // ← was missing; tells the BDD project where generated specs live
  globalSetup: path.resolve(__dirname, 'src/support/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'src/support/global-teardown.ts'),
  // ... rest of config
});
```

Why `path.resolve` instead of a relative string? Playwright resolves relative paths relative to the config file's directory, but `path.resolve(__dirname, ...)` is unambiguous regardless of where you invoke `npx playwright` from.

The `webServer` block (already present) hard-codes `JWT_SECRET` in the environment it passes to `npx nx run api:serve`:

```ts
webServer: [
  {
    command: 'npx nx run api:serve',
    url: `${apiBaseURL}/auth/me`,
    reuseExistingServer: !process.env['CI'],
    // ...
    env: {
      NODE_ENV: 'development',
      PORT: '3000',
      DATABASE_URL: 'file:./dev.db',
      JWT_SECRET: 'dev-not-secret-pin-for-local-do-not-use-in-production',
    },
  },
  // ...
],
```

This is why you need the value to match `.env`. When Playwright starts the API, it injects this `env` block, overriding whatever the process inherits. The value must be the same as what's in `.env` — if they diverge, the API server used during tests signs JWTs with a different key than the one that was running when you generated your stored state.

---

## Exercise

The stored state files have a `_meta` field you added in `globalSetup`. Write a small Node script (`scripts/inspect-auth.mjs`) that:

1. Reads all three `.auth/*.json` files
2. Prints the `_meta.email`, `_meta.role`, and the expiry date decoded from the `localStorage` JWT for each

Then answer: what happens to the stored state if you change `JWT_EXPIRES_IN` from `"1d"` to `"5m"` and re-run the suite immediately? At what point does the stored state become invalid?

---

## Run it

There are no `@module-05` tagged scenarios. Verify the module by running the full suite and inspecting the output:

```bash
npm run e2e:bdd:gen && npx nx e2e web-e2e
```

Then open the generated files:

```
apps/web-e2e/.auth/admin.json
apps/web-e2e/.auth/alice.json
apps/web-e2e/.auth/bob.json
```

Each file should contain:
- `cookies` — an array (likely empty for JWT-localStorage auth)
- `origins` — an array with one entry for `http://localhost:4200`, whose `localStorage` array has one item with key `e2e-quickstart-auth` and a JSON value containing a `token` and `user` object
- `_meta` — the debugging annotation added by `globalSetup`

If any file is missing, check the `[globalSetup]` console output for the error.

---

## Compare

```bash
git diff 05-complete -- apps/web-e2e
```

---

## Cheat sheet

**`globalSetup` / `globalTeardown` lifecycle:**

```
Playwright starts
  → globalSetup runs (once, in the main process)
      → seed.reset()         # clean slate
      → for each role: login via UI, write .auth/<role>.json
  → worker processes start; each runs its assigned scenarios
      → scenario After hooks delete tracked IDs
  → all workers finish
  → globalTeardown runs (once, in the main process)
      → seed.reset()         # belt-and-suspenders sweep
Playwright exits
```

**`storageState` anatomy:**

```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:4200",
      "localStorage": [
        {
          "name": "e2e-quickstart-auth",
          "value": "{\"token\":\"eyJ...\",\"user\":{...}}"
        }
      ]
    }
  ],
  "_meta": { "role": "admin", "userId": "...", "email": "...", "name": "..." }
}
```

**When stored state goes stale:**

| Cause | Symptom | Fix |
|---|---|---|
| `JWT_SECRET` changed | 401 on all protected routes | Restore the pinned secret, rerun |
| `JWT_EXPIRES_IN` elapsed | 401 after the expiry window | Rerun `globalSetup` (full suite run) |
| App's localStorage key changed | App treats user as anonymous | Update `STORAGE_KEY` in `session.ts` to match |

---

## Next

→ [Module 06 — Using sessions in scenarios](../06-using-sessions/README.md)
