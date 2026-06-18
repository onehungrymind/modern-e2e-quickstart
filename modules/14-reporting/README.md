# Module 14 — Reporting

## What you'll learn

- Configuring Playwright's built-in reporters: `list`, `dot`, `html`, `json`, `junit`
- Combining reporters for local dev vs. CI
- Cucumber-style JSON output
- Optional: Allure integration for BDD-first HTML reports

## Why it matters

A test that fails in CI and leaves no trace might as well not have run. Good reporting is the bridge between "the test suite is red" and "here's the specific scenario that failed, here's the trace, here's the screenshot".

## Prerequisites

- Module 13 complete
- `git checkout 14-start`

## Walkthrough

### 1. Built-in reporters

`playwright.config.ts`:

```ts
reporter: process.env['CI']
  ? [['dot'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
  : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
```

What each one does:

- **`list`** — one line per test, full info. Best for local dev.
- **`dot`** — one character per test, compact. Best for CI log tailing.
- **`html`** — full web UI with traces inline. Open with `npm run e2e:report`.
- **`json`** — machine-readable. Useful for dashboards.
- **`junit`** — CI-native XML. GitHub Actions and Jenkins both parse this.

### 2. Cucumber JSON output

For BDD-specific reporting tools (pickle-reporter, cucumber-html-reporter), you'll want Cucumber-flavored output:

```ts
// playwright.config.ts — add to defineBddConfig
defineBddConfig({
  features: './src/features/**/*.feature',
  steps: ['./src/steps/**/*.ts', './src/fixtures/**/*.ts'],
  outputDir: './src/.features-gen',
  statefulPoms: true,
});

// and add a cucumber JSON reporter
reporter: [
  ['list'],
  ['html', { outputFolder: 'playwright-report' }],
  ['cucumber-json', { outputFile: 'cucumber-report.json' }],  // if you've wired it
],
```

A downstream tool can ingest `cucumber-report.json` and render a feature-first summary (features → scenarios → steps, pass/fail/skip per step).

### 3. Optional: Allure

For fancier cross-language reports:

```bash
npm install --save-dev allure-playwright
```

Then add to reporters:

```ts
['allure-playwright', { outputFolder: 'allure-results' }],
```

Generate + open:

```bash
npx allure generate allure-results --clean && npx allure open
```

You get: historical trends across runs, per-test attachments, categories for failures, environment metadata. Overkill for a workshop; legitimately useful for large enterprise suites.

### 4. Attachments

Anything worth preserving per-test attaches directly:

```ts
Given('a seeded project', async ({ seedProject }, testInfo) => {
  const project = await seedProject({ name: 'Attached' });
  await testInfo.attach('seeded-project', {
    body: JSON.stringify(project, null, 2),
    contentType: 'application/json',
  });
});
```

Attachments show up in the HTML report next to each test. Great for "what state did we set up for this test?".

## Exercise

1. Add a `junit` reporter output so a `junit.xml` is written alongside the HTML report. Verify the file is produced.
2. In your favorite @module-07 scenario, add a `testInfo.attach(...)` call that records the seeded project + its tasks as JSON. Open the HTML report and verify the attachment.
3. (Stretch) Wire an allure reporter and produce an allure-results/ output. Generate the report. Skim the UI — is it actually more useful than the HTML report?

## Run it

```bash
npm run e2e          # produces list + html by default
npm run e2e:report   # open HTML
```

## Compare

```bash
git diff 14-complete -- apps/web-e2e
```

## Cheat sheet

**Reporter strategy by use case:**

| Use case | Reporters |
|---|---|
| Local dev, iterating on one test | `list` |
| Local dev, full-suite sanity | `list` + `html` |
| CI log inspection | `dot` + `html` (uploaded as artifact) |
| CI aggregation dashboard | `junit` + `json` |
| Cross-team visibility | `html` (shared via link) + optional `allure` |

**Output locations (defaults):**

- `playwright-report/` — HTML
- `test-results/` — per-test artifacts (traces, screenshots, attachments)
- `playwright-report/data/` — the HTML report's backing data

**CI-friendly `html` options:**

```ts
['html', {
  open: 'never',                 // don't launch a browser in CI
  outputFolder: 'playwright-report',
}]
```

## Next

→ [Module 15 — Env config + capstone](../15-env-config-capstone/README.md)
