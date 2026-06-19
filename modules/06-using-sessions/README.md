# Module 06 — Using sessions in scenarios

**Estimated time:** 35–45 min

## Files you'll create / touch

| File | What changes |
|---|---|
| `apps/web-e2e/src/support/session.ts` | New — `SessionHelper` class: `clear`, `setStoredAuth`, `loadStorageStateForRole` |
| `apps/web-e2e/src/pages/app-shell-page.ts` | New — `AppShellPage` POM: nav visibility, logout |
| `apps/web-e2e/src/pages/login-page.ts` | Add `expectOnLoginPage` and `expectReturnToParam` methods |
| `apps/web-e2e/src/fixtures/test.ts` | Add `appShell` and `session` fixtures |
| `apps/web-e2e/src/steps/auth-session.steps.ts` | New — session step definitions (5 steps) |
| `apps/web-e2e/src/steps/auth.steps.ts` | Minor edits — remove duplicated sign-in step |
| `apps/web-e2e/src/features/auth/storage-state.feature` | New — `@module-06` logged-in scenarios |
| `apps/web-e2e/src/features/auth/anonymous.feature` | New — `@module-06 @anonymous` redirect scenario |
| `apps/web-e2e/src/features/auth/protected-routes.feature` | New — `@module-06` Scenario Outline for protected routes |
| `apps/web-e2e/src/features/auth/logout.feature` | New — logout scenarios |

---

## What you'll learn

- How to load a stored `.auth/<role>.json` into a live browser context
- The `@anonymous` tag as an escape hatch for logged-out scenarios
- How `AppShellPage` models the persistent chrome that surrounds every authenticated page
- How to assert redirect URLs with query parameters (`returnTo`)
- Why the `session` fixture belongs at fixture level rather than as a global before-hook

## Why it matters

Module 05 produced the `.auth/*.json` files. This module is where you spend them.

The core insight is that "log in as admin" in a test doesn't mean "fill the login form as admin." It means "arrange the browser context so the app believes the user is already logged in." Loading a storage-state file is that arrangement — and it's an order of magnitude faster than the form-fill path.

This module also introduces the inverse: scenarios that deliberately need a logged-out browser. Playwright workers by default share nothing, but if your suite ever grows a `storageState` default on the project config, you need an explicit `@anonymous` escape. The pattern here establishes that escape hatch before it's needed.

---

## Prerequisites

- Module 05 complete (`.auth/admin.json`, `.auth/alice.json`, `.auth/bob.json` exist)
- `git checkout 06-start`

---

## Walkthrough

### 1. Create `apps/web-e2e/src/support/session.ts`

The `SessionHelper` class is the bridge between the `.auth/` files and the live browser context a scenario runs in.

```ts
import * as fs from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';
import { storageStatePath, type E2ERole } from './env';
import type { SeededUser } from './seed';

const STORAGE_KEY = 'e2e-quickstart-auth';

export class SessionHelper {
  readonly page: Page;
  readonly context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  async clear() {
    await this.context.clearCookies();
  }

  async setStoredAuth(user: SeededUser) {
    await this.context.clearCookies();
    await this.page.goto('/login');
    await this.page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [
        STORAGE_KEY,
        JSON.stringify({
          token: user.token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        }),
      ] as [string, string],
    );
  }

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

Three methods, three situations:

**`clear()`** — the `@anonymous` escape hatch. Clears all cookies for the context. Used when a scenario needs a guaranteed logged-out state. `clearCookies` alone is enough here because this app stores auth in localStorage, not cookies — but it's defensive: if cookies ever enter the picture, this step still works.

**`setStoredAuth(user)`** — used later (Module 07+) when a scenario seeds its own user via the API and needs to log in as that specific person. It can't use `loadStorageStateForRole` because the user didn't exist when `globalSetup` ran. Instead it writes the auth data directly into localStorage using `page.evaluate`. Notice it navigates to `/login` first: `evaluate` runs JavaScript in the page, and there's no page context until the browser has navigated somewhere on the same origin.

**`loadStorageStateForRole(role)`** — the main method in this module. It reads the JSON file written by `globalSetup`, clears existing cookies, navigates to `/login` to establish an origin context, then iterates `state.origins[].localStorage[]` and sets each key-value pair via `page.evaluate`. After this method returns, the app's JavaScript will find the auth token in localStorage exactly as if the user had logged in via the form.

The `STORAGE_KEY` constant `'e2e-quickstart-auth'` must match the key the React app uses to store auth. If you inspect the app's localStorage during a manual login you'll see this key. If the app ever changes this key, you update it here and in `globalSetup`.

---

### 2. Create `apps/web-e2e/src/pages/app-shell-page.ts`

The "app shell" is the persistent UI that surrounds every authenticated page — navigation bar, user menu, logout button. It appears on `/projects`, `/users`, `/profile`, and every other protected route.

```ts
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AppShellPage {
  readonly page: Page;
  readonly nav: Locator;
  readonly userMenu: Locator;
  readonly profileLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.getByTestId('app-nav');
    this.userMenu = page.getByTestId('app-nav-user-menu');
    this.profileLink = page.getByTestId('app-nav-profile-link');
    this.logoutButton = this.nav.getByRole('button', { name: 'Log out' });
  }

  async expectVisible() {
    await expect(this.nav).toBeVisible();
  }

  async logout() {
    this.page.once('dialog', (d) => d.accept());
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}
```

Key design decisions:

- **`getByTestId('app-nav')`** — the nav is a structural element without a natural ARIA role, so a test-id is the right locator tier. The test-id format follows the project convention: `{page-or-feature}-{component}`.
- **`this.nav.getByRole('button', { name: 'Log out' })`** — the logout button is scoped inside the nav. Scoping prevents false matches if the same text appears elsewhere on the page.
- **`this.page.once('dialog', (d) => d.accept())`** — the logout action triggers a browser confirmation dialog ("Are you sure?"). The `once` listener is registered just before the click so it fires exactly once and then removes itself. If you used `page.on` instead, it would fire on every dialog for the rest of the scenario.
- **`waitForURL('**/login')`** — asserting the post-logout destination as part of the `logout()` action makes the action self-verifying. Callers don't need to add a navigation assertion themselves.

---

### 3. Add methods to `apps/web-e2e/src/pages/login-page.ts`

The `LoginPage` class from Module 02 already has `goto()` and `signIn()`. This module adds two assertion methods:

```ts
async expectOnLoginPage() {
  await expect(this.page).toHaveURL(/\/login/);
}

async expectReturnToParam(path: string) {
  const escaped = encodeURIComponent(path).replace(/[/]/g, '\\$&');
  await expect(this.page).toHaveURL(new RegExp(`/login\\?returnTo=${escaped}`));
}
```

**`expectOnLoginPage()`** — a simple URL assertion. Uses a regex (`/\/login/`) rather than an exact string to avoid coupling to the full origin or any trailing query params.

**`expectReturnToParam(path)`** — this one is more subtle. When an anonymous user tries to visit `/projects`, the app redirects them to `/login?returnTo=%2Fprojects`. The method:

1. Calls `encodeURIComponent(path)` to convert `/projects` → `%2Fprojects` (the same encoding the app produces).
2. Calls `.replace(/[/]/g, '\\$&')` to escape any `/` characters that remain in the encoded string, since unescaped `/` would be interpreted as a regex delimiter. This is defensive for paths like `/users/profile` where `/` appears after encoding.
3. Builds a `RegExp` and passes it to `toHaveURL`. Using a regex instead of an exact string means the assertion doesn't break if Playwright or the app adds a hash or trailing param.

---

### 4. Add fixtures to `apps/web-e2e/src/fixtures/test.ts`

Two fixtures are added to the existing `test.extend` block. Below is the relevant excerpt — the full file also contains `scenarioWorld`, `seedUser`, `seedProject`, `seedTask`, and the POM fixtures from earlier modules.

**The `appShell` fixture:**

```ts
appShell: async ({ page }, use) => {
  await use(new AppShellPage(page));
},
```

Simple. The `AppShellPage` is a POM, scenario-scoped, and depends only on `page`. No teardown needed.

**The `session` fixture:**

```ts
session: async ({ page, context }, use) => {
  await use(new SessionHelper(page, context));
},
```

`SessionHelper` needs both `page` (to call `goto` and `evaluate`) and `context` (to call `clearCookies`). Playwright provides both as built-in fixtures. Because `SessionHelper` holds references to `page` and `context`, it automatically stays in sync with whatever state they're in — no need to pass them around at call time.

The fixture type declarations in the same file are updated to include these two:

```ts
type Fixtures = {
  // ... existing fixtures ...
  appShell: AppShellPage;
  session: SessionHelper;
};
```

And the imports at the top of the file grow:

```ts
import { AppShellPage } from '../pages/app-shell-page';
import { SessionHelper } from '../support/session';
```

---

### 5. Create `apps/web-e2e/src/steps/auth-session.steps.ts`

This file contains the five session-related steps that Module 06 introduces. A sixth step — `an E2E member is logged in` — is intentionally excluded here because it depends on the `seedUser` fixture which requires the seed infrastructure taught in Module 07.

```ts
import { Given, When, Then } from '../fixtures/test';
import type { E2ERole } from '../support/env';

Given('I am not logged in', async ({ session }) => {
  await session.clear();
});

When('I open {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

Then(
  'I land on the login page with returnTo {string}',
  async ({ loginPage }, returnTo: string) => {
    await loginPage.expectReturnToParam(returnTo);
  },
);

Given('I am logged in as {string}', async ({ session }, role: string) => {
  await session.loadStorageStateForRole(role as E2ERole);
});

Then('I see the top nav', async ({ appShell }) => {
  await appShell.expectVisible();
});
```

Each step is a thin delegation to the right collaborator:

- **`Given I am not logged in`** → `session.clear()`. The step reads like English and the implementation is one line. This is the `@anonymous` entry point.
- **`When I open {string}`** → `page.goto(path)`. A low-level navigation step intentionally written without a Page Object, because it applies to any arbitrary URL rather than a named page.
- **`Then I land on the login page with returnTo {string}`** → `loginPage.expectReturnToParam(returnTo)`. The URL encoding and regex logic lives in the POM where it can be tested in isolation.
- **`Given I am logged in as {string}`** → `session.loadStorageStateForRole(role as E2ERole)`. The cast to `E2ERole` is necessary because Gherkin strings arrive as `string`; TypeScript can't narrow at runtime, but the test will throw a meaningful file-not-found error if an invalid role is passed.
- **`Then I see the top nav`** → `appShell.expectVisible()`. Because `AppShellPage` is a fixture, the step just destructures it — no instantiation in the step body.

The import of `{ Given, When, Then }` comes from `../fixtures/test` (the extended test), not from `playwright-bdd` directly. This is what gives step definitions access to the custom fixtures.

---

### 6. Edit `apps/web-e2e/src/steps/auth.steps.ts`

By Module 06, `auth.steps.ts` handles the form-based login steps — the ones that fill the email and password fields. The file after this module's edits:

```ts
import { Given, When, Then, expect } from '../fixtures/test';

Given('a seeded E2E member user', async ({ seedUser }) => {
  await seedUser({ role: 'member' });
});

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

When("I sign in with the seeded user's credentials", async ({ loginPage, scenarioWorld }) => {
  const user = scenarioWorld.seededUser;
  if (!user) throw new Error('seededUser is not set — did a prior Given step run?');
  await loginPage.signIn(user.email, user.password);
});

When(
  "I sign in with the seeded user's email and password {string}",
  async ({ loginPage, scenarioWorld }, password: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('seededUser is not set');
    await loginPage.signIn(user.email, password);
  },
);

Then('I land on the projects page', async ({ projectsListPage }) => {
  await expect(projectsListPage.heading).toBeVisible();
});

Then('I see the error {string}', async ({ loginPage }, message: string) => {
  await expect(loginPage.errorMessage).toHaveText(message);
});
```

The key edit is the removal of any duplicated `I sign in with email {string} and password {string}` step that may have existed in prior modules. Having a step defined twice causes `playwright-bdd` to throw a "duplicate step" error at generation time. The canonical home for session loading is `auth-session.steps.ts`; the form-filling steps remain in `auth.steps.ts`.

---

### 7. Write the feature files

**`apps/web-e2e/src/features/auth/storage-state.feature`** — proves that `loadStorageStateForRole` actually skips the login form:

```gherkin
@auth @module-05 @module-08
Feature: Stored auth session skips the login UI

  Scenario: admin lands straight on /projects
    Given I am logged in as "admin"
    When I visit the projects page
    Then I see the top nav

  Scenario: alice lands straight on /projects
    Given I am logged in as "alice"
    When I visit the projects page
    Then I see the top nav
```

Two scenarios, two roles. After `Given I am logged in as "admin"`, there are no login form steps. `When I visit the projects page` navigates directly to `/projects`. `Then I see the top nav` confirms the app accepted the stored auth.

**`apps/web-e2e/src/features/auth/anonymous.feature`** — the single-scenario version of the redirect:

```gherkin
@auth @module-05 @anonymous
Feature: Anonymous users are redirected

  Scenario: accessing a protected page redirects to login with returnTo
    Given I am not logged in
    When I open "/projects"
    Then I land on the login page with returnTo "/projects"
```

The `@anonymous` tag is a documentation convention in this codebase. It signals to readers that this scenario intentionally starts from a logged-out state. In a future extension you could use it to gate which beforeAll hooks apply, but for now it's descriptive.

**`apps/web-e2e/src/features/auth/protected-routes.feature`** — a Scenario Outline that exercises the redirect across all three protected routes:

```gherkin
@auth @module-05
Feature: Protected routes redirect with returnTo

  Background:
    Given I am not logged in

  Scenario Outline: anonymous user is bounced from <path>
    When I open "<path>"
    Then I land on the login page with returnTo "<path>"

    Examples:
      | path       |
      | /projects  |
      | /users     |
      | /profile   |
```

The `Background` section runs `Given I am not logged in` before each outline row. The Scenario Outline is then purely about navigation and assertion — no auth preamble clutters the readable part.

**`apps/web-e2e/src/features/auth/logout.feature`** — two logout scenarios that use `I am logged in as`, `AppShellPage.logout()`, and the session assertions:

```gherkin
@auth @module-01
Feature: Logout

  Scenario: logging out returns the user to the login page
    Given I am logged in as "alice"
    When I visit the projects page
    And I log out from the top nav
    Then I land on the login page

  Scenario: logging out clears the stored session
    Given I am logged in as "alice"
    When I visit the projects page
    And I log out from the top nav
    When I open "/projects"
    Then I land on the login page with returnTo "/projects"
```

The first scenario checks the happy path: logout lands on `/login`. The second is a security invariant: after logout, visiting a protected route again re-triggers the redirect (the stored auth was actually cleared, not just hidden).

The `@module-01` tag on the feature (not `@module-06`) reflects that logout was introduced as part of the original auth feature set. If you grep for `@module-06` you get the storage-state and anonymous redirect scenarios; if you grep for `@module-01` you get the original login + logout proof.

---

## Exercise

Add a third scenario to `storage-state.feature` that proves `alice`'s stored auth is genuinely alice's identity, not a generic logged-in state:

```gherkin
Scenario: alice's stored session shows alice's profile
  Given I am logged in as "alice"
  When I navigate to "/profile"
  Then I see my email is "E2E_baseline_alice@example.com"
```

You'll need to:
1. Add a `When I navigate to {string}` step (or reuse `When I open {string}`).
2. Add a `ProfilePage` POM with an `info` locator (look at the `getByTestId('profile-info')` pattern used elsewhere).
3. Add a `Then I see my email is {string}` step.
4. Wire `profilePage` as a fixture if it isn't already.

This exercise reinforces that storage state is role-specific: if you swap `"alice"` for `"admin"` the email assertion will fail.

---

## Run it

```bash
npm run e2e -- --grep @module-06
```

You should see all scenarios in `storage-state.feature`, `anonymous.feature`, `protected-routes.feature`, and `logout.feature` pass without any login-form steps appearing in the trace.

To verify the `@anonymous` path specifically:

```bash
npm run e2e -- --grep "@module-06 and @anonymous"
```

---

## Compare

```bash
git diff 06-complete -- apps/web-e2e
```

---

## Cheat sheet

**Auth entry points — when to use which:**

| Situation | Step | What it does |
|---|---|---|
| Scenario needs a known, persistent role (admin/alice/bob) | `Given I am logged in as "admin"` | Reads `.auth/admin.json`, writes to localStorage |
| Scenario needs a logged-out browser | `Given I am not logged in` | `context.clearCookies()` |
| Scenario needs a freshly seeded user (Module 07+) | `Given an E2E member is logged in` | Seeds user via API, writes token to localStorage |

**`loadStorageStateForRole` flow:**

```
read .auth/<role>.json from disk
  → clearCookies() on the current context
  → page.goto('/login')          # establish same-origin context for evaluate()
  → for each localStorage item:
      page.evaluate(([k, v]) => localStorage.setItem(k, v), [name, value])
```

After the method returns, the app's React auth hook reads `localStorage['e2e-quickstart-auth']` and finds a valid token — identical to what a real login would have produced.

**`@anonymous` pattern:**

```gherkin
@anonymous
Scenario: some logged-out scenario
  Given I am not logged in   # ← always first step; establishes clean state
  When I open "/projects"
  Then I land on the login page with returnTo "/projects"
```

If you ever configure a `storageState` default on the Playwright project, `@anonymous` scenarios still need this `Given` step to clear it. The tag documents the intent; the step enforces it.

**`expectReturnToParam` internals:**

The `returnTo` query param is percent-encoded by the app (`/projects` → `%2Fprojects`). The method calls `encodeURIComponent` to build the expected regex. If you're asserting a path with multiple segments (e.g. `/users/123`), `encodeURIComponent` handles all slashes correctly:

```
encodeURIComponent('/users/123') → '%2Fusers%2F123'
```

---

## Next

→ [Module 07 — The /test seam + seed fixtures](../07-test-seam-seed-fixtures/README.md)
