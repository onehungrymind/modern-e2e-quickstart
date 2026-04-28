# Module 05 — Auth & storage state

## What you'll learn

- What `storageState` is (cookies + localStorage snapshot)
- Login-once-per-worker vs. login-per-scenario
- How `globalSetup` prepares role-scoped storage state files
- The `@anonymous` escape hatch for tests that need a fresh, logged-out browser
- Why you should pin `JWT_SECRET`

## Why it matters

Every test that starts with "log in" pays 500ms–1s in the login form. Multiply by 30 scenarios and you've added 15-30 seconds to the suite. Worse: if a test's *real* concern is "can an admin delete a project", having 4 preamble steps login-noise distracts the reader.

`storageState` fixes both: log in *once*, snapshot the browser state, inject it into every scenario that needs an authenticated user.

## Prerequisites

- Module 04 complete
- `git checkout 05-start`

## Walkthrough

### 1. Pin `JWT_SECRET` first

Stored auth only works across runs if the server's JWT signing key doesn't change. `.env.example`:

```
JWT_SECRET="dev-not-secret-pin-for-local-do-not-use-in-production"
```

The NestJS `AuthModule` reads `process.env.JWT_SECRET`. The E2E Playwright config passes the same value to the api's `webServer.env`. Stored tokens stay valid across reruns.

### 2. Write a `globalSetup`

`apps/web-e2e/src/support/global-setup.ts` runs once before any test:

```ts
import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { seed } from './seed';
import { E2E_WEB_BASE_URL, ROLES, storageStatePath } from './env';

export default async function globalSetup(_config: FullConfig) {
  const authDir = path.resolve(__dirname, '../../.auth');
  fs.mkdirSync(authDir, { recursive: true });

  await seed.reset();

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
      fs.writeFileSync(storageStatePath(role), JSON.stringify(state, null, 2));
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
```

Wire it into `playwright.config.ts`:

```ts
globalSetup: path.resolve(__dirname, 'src/support/global-setup.ts'),
```

After `npm run e2e`, inspect `apps/web-e2e/.auth/`:

```
admin.json
alice.json
bob.json
```

Each is a full browser-state snapshot.

### 3. Load storage state in a scenario

Create a `session` helper that loads the right role's state into the current context:

```ts
// support/session.ts
export class SessionHelper {
  constructor(readonly page: Page, readonly context: BrowserContext) {}

  async loadStorageStateForRole(role: E2ERole) {
    const state = JSON.parse(fs.readFileSync(storageStatePath(role), 'utf-8'));
    await this.context.clearCookies();
    await this.page.goto('/login');
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        await this.page.evaluate(
          ([k, v]: [string, string]) => window.localStorage.setItem(k, v),
          [item.name, item.value] as [string, string],
        );
      }
    }
  }
}
```

Expose it as a fixture, then write the composite step:

```ts
Given('I am logged in as {string}', async ({ session }, role: string) => {
  await session.loadStorageStateForRole(role as E2ERole);
});
```

Feature:

```gherkin
@auth @module-05
Scenario: admin lands straight on /projects
  Given I am logged in as "admin"
  When I visit the projects page
  Then I see the top nav
```

Zero form filling. The user is "authenticated" before the scenario starts.

### 4. The `@anonymous` escape hatch

Some scenarios *need* a fresh, logged-out browser. Tag them `@anonymous` and make sure they explicitly clear cookies:

```gherkin
@auth @module-05 @anonymous
Scenario: accessing a protected page redirects to login with returnTo
  Given I am not logged in
  When I open "/projects"
  Then I land on the login page with returnTo "/projects"
```

The `Given I am not logged in` step calls `session.clear()` (clearing cookies and the stored auth localStorage).

## Exercise

Add two scenarios:

1. A `Scenario Outline` that visits each protected route (`/projects`, `/users`, `/profile`) as an anonymous user and asserts the returnTo-preserving redirect.
2. A scenario that proves alice's stored state is genuinely *alice* — visit `/profile` after `Given I am logged in as "alice"` and assert the email is `alice`'s.

## Run it

```bash
npm run e2e -- --grep @module-05
```

## Compare

```bash
git diff 05-complete -- apps/web-e2e
```

## Cheat sheet

**storageState lifecycle:**

```
globalSetup
  → for each role: fresh context, log in via UI, context.storageState() → write .auth/<role>.json
(tests run; each scenario that needs auth loads the file into its context)
globalTeardown
  → reset if you want
```

**When to use which:**

| Scenario goal | Auth approach |
|---|---|
| Test an authenticated user flow | `Given I am logged in as "alice"` |
| Test the login form itself | `Given I am not logged in` + fill the form |
| Test an anonymous redirect | `Given I am not logged in` |
| Test role-specific behavior (admin vs member) | `Given I am logged in as "admin"` |

**Gotcha:** stored state goes stale if the JWT key changes. Pin `JWT_SECRET`. In production you'd add token refresh and re-run `globalSetup` when the backend session model evolves.

## Next

→ [Module 06 — API + UI hybrid](../06-api-ui-hybrid/README.md)
