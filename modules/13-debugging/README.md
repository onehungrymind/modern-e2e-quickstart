# Module 13 — Debugging

## What you'll learn

- Playwright's UI mode (`--ui`) — time-travel debugger for tests
- Trace Viewer — post-mortem inspection of recorded runs
- `test.step()` — group actions for clearer traces and reports
- `page.pause()` — pause execution to inspect in a real browser
- `codegen` — record interactions as boilerplate Playwright code

## Why it matters

When a test fails, the stack trace tells you *what assertion failed*. It rarely tells you *why*. Playwright's debugging tools show you the DOM at the moment of failure, the network calls, the console logs — everything. Learning them turns 2-hour debug sessions into 2-minute ones.

## Prerequisites

- Module 12 complete
- `git checkout 13-start`

This module is tool-focused — fewer code changes, more hands-on exploration.

## Walkthrough

### 1. UI mode — the interactive debugger

```bash
npm run e2e:ui
```

Opens an interactive panel showing every test. Click a test → it runs in a visible browser → you see each step highlighted with the exact DOM at that moment. Scrub backwards and forwards. Watch selectors highlight the element they matched.

**Best use:** you're writing a new test and don't know why your locator misses.

### 2. Trace Viewer — the post-mortem

Traces get recorded automatically on test failure (`trace: 'on-first-retry'` in `playwright.config.ts`). On a failed test:

```bash
npx playwright show-trace test-results/<scenario-dir>/trace.zip
```

You get a timeline of every action, DOM snapshots at each step, network requests, console output, and the source line. Sometimes you spot the issue in 10 seconds.

To always record traces:

```bash
npx playwright test --trace on
```

### 3. `test.step()` — structured actions

Group related actions for cleaner traces and reports:

```ts
When('I complete the checkout flow', async ({ page }, testInfo) => {
  await testInfo.attach('order-intent', { body: JSON.stringify(...) });

  await test.step('fill shipping info', async () => {
    await page.getByLabel('Name').fill('Alice');
    // ...
  });

  await test.step('fill payment', async () => {
    // ...
  });

  await test.step('submit', async () => {
    await page.getByRole('button', { name: 'Place order' }).click();
    await page.waitForURL('**/success');
  });
});
```

In UI mode and the HTML report, each step collapses so you can jump to the one that mattered.

### 4. `page.pause()` — drop into dev tools

Insert in a step def:

```ts
When('I do the thing', async ({ page }) => {
  await page.pause();
  // ... the test halts here with an inspector opened in the browser
});
```

Great for "I think my selector is wrong" or "what's actually in this dropdown right now". Don't commit.

### 5. `codegen` — record, don't write

For quickly bootstrapping new tests or POMs:

```bash
npx playwright codegen http://localhost:4200
```

Drives a real browser. Every click/fill you do prints the equivalent Playwright code. Copy-paste as a starting point, then refactor into POM + step def shape.

Don't treat codegen output as final — it uses default locators which often aren't what you want. Use it as a cheat sheet, not a generator.

### 6. The HTML report

```bash
npm run e2e
npm run e2e:report
```

Opens `playwright-report/index.html`. Every scenario expandable, traces viewable inline, screenshots, console output. Great for sharing with a teammate who isn't at their machine.

## Exercise

1. Pick any `@module-07` scenario. Run it with `--ui`. Practice scrubbing through every step. Identify where the DOM first becomes the state your assertion checks.
2. Break the `"I land on the projects page"` step — change the URL regex to something that doesn't match. Run the scenario. Use the resulting trace to find the exact moment your assertion diverges from reality.
3. Insert `await test.step(...)` groupings into `projectsListPage.createProject()`. Re-run the @projects scenarios and view the report — notice the step structure in the trace timeline.

## Run it

```bash
npm run e2e:ui       # interactive
npm run e2e          # normal run — check playwright-report after
npm run e2e:report   # open the last HTML report
```

## Compare

```bash
git diff 13-complete -- apps/web-e2e
```

## Cheat sheet

**When your test fails, in order:**

1. Read the error message — is the selector clearly wrong?
2. Open the trace (`npx playwright show-trace ...`) — see the DOM at failure
3. Re-run with `--headed` — watch it happen live
4. Drop `await page.pause()` just before the failure — drive manually from there
5. Re-run with `--debug` — Playwright Inspector step-through
6. `codegen` a minimal version of the interaction — compare to your step

**Playwright Inspector vs. UI mode:**

- **UI mode** (`--ui`) — all tests, scrub through any, visual-first
- **Inspector** (`--debug`) — single test, step-by-step, breakpoint-like

**Gotcha:** traces are only saved for failed tests by default. If a test passes flakily, you won't have a trace. Set `trace: 'on'` temporarily to always record.

## Next

→ [Module 14 — Reporting](../14-reporting/README.md)
