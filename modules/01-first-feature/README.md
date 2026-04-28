# Module 01 — First feature + step definitions

## What you'll learn

- The three-file structure of a `playwright-bdd` scenario: `.feature`, `.steps.ts`, generated spec
- How Gherkin keywords (Given / When / Then) map to TypeScript step functions
- Cucumber expressions with `{string}` parameters
- How `bddgen` wires features to steps at build time

## Why it matters

Every concept in the rest of the workshop builds on this one. Get comfortable with the feature-to-step handoff here and the rest of the modules will click.

## Prerequisites

- Module 00 complete
- `git checkout 01-start`

## Walkthrough

### 1. Write your first feature file

Create `apps/web-e2e/src/features/auth/login.feature`:

```gherkin
@auth @module-01
Feature: Login

  @smoke
  Scenario: successful login with admin credentials
    Given I am on the login page
    When I sign in with email "admin@example.com" and password "Admin123!"
    Then I land on the projects page
```

A few things to notice:

- **Tags** (`@auth`, `@module-01`, `@smoke`) — let you filter which scenarios run (Module 04 goes deep on these).
- **Feature** is the "what" — a single page, user journey, or domain area.
- **Scenario** is one specific example of that feature working. One scenario per behavior.
- **Given / When / Then** — setup / action / assertion.

### 2. Write the step definitions

Create `apps/web-e2e/src/steps/auth.steps.ts`:

```ts
import { createBdd, test as base } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(base);

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login');
});

When(
  'I sign in with email {string} and password {string}',
  async ({ page }, email: string, password: string) => {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  },
);

Then('I land on the projects page', async ({ page }) => {
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});
```

A few things to notice:

- Step text matches exactly — every word, punctuation, and quoted `{string}` parameter.
- The step function receives a fixtures object first (`{ page }`), then the captured parameters in order.
- We use `getByLabel` and `getByRole` over `getByTestId` where possible — Playwright's accessibility-first guidance (more in Module 02).
- The direct `page.getByX()` calls here are a **stepping stone**. In Module 02 we refactor these to route through a Page Object.

### 3. Run it

```bash
npm run e2e:smoke
```

You should see:

```
1 passed (1.2s)
```

Under the hood, `bddgen` transformed your `.feature` file into a generated `.spec.js` in `.features-gen/`, and Playwright ran it.

### 4. Add a second scenario

Add a failing-login scenario to the same feature file:

```gherkin
  Scenario: login rejects wrong password
    Given I am on the login page
    When I sign in with email "admin@example.com" and password "wrong-password"
    Then I see the error "Invalid email or password"
```

You'll need a new step:

```ts
Then('I see the error {string}', async ({ page }, message: string) => {
  await expect(page.getByTestId('login-error-message')).toHaveText(message);
});
```

Notice the `login-error-message` test-ID — no ARIA role on inline error messages, so test-IDs are the right tool.

### 5. Run again

```bash
npm run e2e -- --grep @auth
# 2 passed
```

## Exercise

Add a third scenario covering: *when an already-authenticated user visits /login, they bounce to /projects*.

Hints:
- You'll need a way to "be logged in" before visiting /login. A simple approach: run the happy-path login, then navigate to /login, then assert the URL.
- The step `When I open "/login"` is a good reusable shape — you'll write the generic `When I open {string}` step later in Module 05.

## Run it

```bash
npm run e2e -- --grep @module-01
```

Expect: 3 passed.

## Compare

```bash
git diff 01-complete -- apps/web-e2e
```

## Cheat sheet

**Feature file anatomy:**

```gherkin
@tag1 @tag2
Feature: Name

  Background:              # runs before every scenario
    Given some-setup

  @scenario-tag
  Scenario: what
    Given ...
    When  ...
    Then  ...
```

**Step def anatomy:**

```ts
Given('step text with {string}', async ({ fixtures }, param: string) => {
  // ...
});
```

Cucumber parameter types: `{string}`, `{int}`, `{float}`, `{word}`. See [Cucumber expressions docs](https://github.com/cucumber/cucumber-expressions).

**Gotcha:** `/` in step text is treated as an alternative — escape with `\/` or rename the step.

## Next

→ [Module 02 — Page objects + locator strategy](../02-page-objects-locator-strategy/README.md)
