# Module 02 — Page objects + locator strategy

## What you'll learn

- What a Page Object Model (POM) is and why it matters
- The layered locator strategy: `getByRole` → `getByLabel` → `getByText` → `getByTestId` → `.filter()`
- The hard rule: **step definitions never touch the DOM directly**
- How to compose POMs (page → row → form) without coupling

## Why it matters

Module 01 had step defs calling `page.getByLabel('Email').fill(...)` directly. That works for one scenario. By scenario thirty, every time the designer renames a label, you update fifty step defs. POMs fix that: the POM is the *only* place that knows about the DOM. Steps become high-level prose.

This is the single highest-leverage pattern in E2E testing. Get it right and future-you will thank you.

## Prerequisites

- Module 01 complete
- `git checkout 02-start`

## Walkthrough

### 1. The locator layering

In order, prefer:

1. **`getByRole('button', { name: 'Save' })`** — anything with an ARIA role and accessible name: buttons, links, headings, checkboxes. Tests implicitly verify accessibility.
2. **`getByLabel('Email')`** — form fields with visible `<label>`.
3. **`getByText('Welcome back')`** — static content assertions.
4. **`getByTestId('login-error-message')`** — structural scaffolding without a natural role: row containers, toast holders, inline errors, empty states.
5. **`.filter({ hasText: 'My Project' })`** — select a specific row inside a list container.

**Hard rule: no dynamic IDs in test-IDs.** Never `projects-list-item-{cuid}`. Rows get a stable `projects-list-item` test-ID; disambiguation comes from content filtering (and per-scenario uniqueness — Module 06).

### 2. Create `BasePage`

`apps/web-e2e/src/pages/base-page.ts`:

```ts
import type { Locator, Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }
}
```

Deliberately tiny. Specific page-shared stuff (top nav, toasts) lives in a dedicated shell POM (see `AppShellPage` in the canonical solution).

### 3. Create `LoginPage`

`apps/web-e2e/src/pages/login-page.ts`:

```ts
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

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

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

Two kinds of properties:

- **Named locators** — `emailInput`, `errorMessage`. The *public surface* of the page. Step defs use these for assertions (`await expect(loginPage.errorMessage).toHaveText(...)`).
- **High-level methods** — `signIn(email, password)`. Semantic actions, not input-box-by-input-box narration.

### 4. Refactor the step defs

Replace the direct `page.*` calls with POM methods:

```ts
import { test as base, createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

const { Given, When, Then } = createBdd(base);
// ... we'll wire LoginPage as a fixture properly in Module 03
```

For now (before fixtures), instantiate it in each step:

```ts
Given('I am on the login page', async ({ page }) => {
  await new LoginPage(page).goto();
});

When(
  'I sign in with email {string} and password {string}',
  async ({ page }, email: string, password: string) => {
    await new LoginPage(page).signIn(email, password);
  },
);

Then('I see the error {string}', async ({ page }, message: string) => {
  await expect(new LoginPage(page).errorMessage).toHaveText(message);
});
```

Module 03 introduces fixtures so you can say `async ({ loginPage }) => ...` and drop the `new LoginPage(page)` boilerplate.

### 5. Run it

```bash
npm run e2e:auth
```

Everything that passed before should still pass. If it doesn't, your POM is probably selecting something subtly different from the direct calls — diff `pages/login-page.ts` against the prior inline selectors.

## Exercise

Build a `ProjectsListPage`. Include:

- `heading` — the "Projects" heading
- `searchInput` — the search field
- `newProjectButton` — the "New project" button
- `list` — the `projects-list` container
- `row(name: string)` — a locator for a specific project row, filtered by name
- `emptyState` — the empty-state block
- `goto()` method

Then write a new scenario that asserts:

```gherkin
@projects @module-02
Scenario: the seeded admin sees the Apollo project
  Given I am on the login page
  When I sign in with email "admin@example.com" and password "Admin123!"
  Then I see the project "Apollo Launch" in the list
```

Your new `Then` step should use `projectsListPage.row(name)` — no direct `page.getByTestId('projects-list-item')` in the step def.

**Warning:** using dev seed users in E2E is a bad habit — we "do it once" here for teaching the POM mechanics. Module 06 fixes this properly by introducing API-seeded `E2E_`-prefixed test users.

## Run it

```bash
npm run e2e -- --grep @module-02
```

## Compare

```bash
git diff 02-complete -- apps/web-e2e
```

## Cheat sheet

**The locator decision tree:**

```
Does it have a role + accessible name?  → getByRole
Is it a labeled form field?             → getByLabel
Is it static, visible text?             → getByText
Structural scaffold / no role?          → getByTestId
Select one of N matching things?        → <parent>.filter({ hasText })
```

**POM structure:**

```ts
export class SomePage extends BasePage {
  // 1. readonly locators
  readonly heading: Locator;

  // 2. constructor wires them up
  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Some Page' });
  }

  // 3. goto() for navigation
  async goto() {
    await this.page.goto('/some-page');
  }

  // 4. semantic actions
  async doSomethingMeaningful(value: string) { ... }

  // 5. row-level locators for lists
  row(key: string): Locator {
    return this.list.getByTestId('some-list-item').filter({ hasText: key });
  }
}
```

**The one rule:** `page.getByX()` never appears inside a `.steps.ts` file. Only in `.ts` files under `pages/`.

## Next

→ [Module 03 — Fixtures, hooks, world](../03-fixtures-hooks-world/README.md)
