# Module 12 — Parallel, retries, and flake hunting

## What you'll learn

- How `fullyParallel: true` changes the game
- When to use `--repeat-each` to hunt flake
- The two common sources of flake: state pollution and race conditions
- Why this suite's `@flaky` scenario deliberately fails under parallel load — and how to fix it

## Why it matters

A green suite is worthless if it's flaky. The single biggest cause of "we disabled E2E in CI" is flake that the team stopped trusting. Understanding *why* tests flake — and building habits that prevent it — is the most valuable skill you'll take from this workshop.

## Prerequisites

- Module 11 complete
- `git checkout 12-start`

## Walkthrough

### 1. Parallelism in this suite

`playwright.config.ts`:

```ts
fullyParallel: true,
workers: process.env['CI'] ? 2 : 4,
```

- `fullyParallel: true` — every scenario runs in its own worker-assigned context. No cross-scenario state.
- `workers: 4` — 4 concurrent OS processes, each driving its own browser.

Real-world speedup: 47 scenarios in 17-18s with 4 workers vs. ~70s serialized.

### 2. Flake sources, in order of frequency

1. **State pollution** — two tests modifying the same data (dev user, shared project name).
2. **Race conditions** — assertions that fire before the UI has finished rendering.
3. **Network timing** — assumptions about response ordering.
4. **Selector ambiguity** — a locator that was "one element" becoming multiple when parallel workers create more rows.

Source 1 dominates. If your parallel suite is flaking, start by auditing test isolation.

### 3. The `@flaky` demo

`apps/web-e2e/src/features/flaky.feature`:

```gherkin
@module-12 @flaky
Feature: Deliberate flake demo

  Scenario: two workers race on a shared project name
    Given an E2E member is logged in
    When I create a project named "Shared Project"
    Then I see the project "Shared Project" in the list
```

This scenario deliberately violates the isolation patterns from Module 07:

- **No `E2E_` prefix** on the user-visible name (bypassing the seed fixture's auto-suffix)
- **No `scenarioId` in the project name** — every parallel run uses the literal string "Shared Project"
- **No cleanup** — the POM `createProject()` method doesn't track the ID

Run it:

```bash
npm run e2e:flaky   # --grep @flaky --repeat-each 5
```

Expected: some runs pass, some fail with "resolved to N elements" strict-mode errors. The failures correlate with parallel timing.

### 4. How to fix it

Apply the isolation discipline from Module 07:

```ts
// In the fixture, not in the feature file
When('I create a project named {string}', async ({ projectsListPage, scenarioWorld }, name: string) => {
  const unique = `${name}_${scenarioWorld.scenarioId}`;
  await projectsListPage.createProject(unique);
  scenarioWorld.projectNames.set(name, `E2E_${unique}`);
  // cleanup happens via scenarioWorld.createdProjectIds, if the POM pushes it
});
```

Or: change the feature's name to a scenario-unique literal. Or: use API seed with the seedProject fixture (auto-unique). Each approach has trade-offs — the workshop canonical solution picks the fixture-driven one.

### 5. Retries

`playwright.config.ts` retries 1 time on CI, 0 times locally. Retries mask flake but don't fix it. Use them as a *tripwire* — if CI frequently flips on retry, something is wrong.

**Flake hunting workflow:**

```bash
# Reproduce locally — repeat each scenario N times
npx playwright test --grep @flaky --repeat-each 10

# Run one scenario with tracing on every attempt
npx playwright test path/to/spec --trace on

# Open the trace to see exactly what happened
npx playwright show-trace trace.zip
```

## Exercise

1. Run `npm run e2e:flaky` at least 5 times. Count passes vs. failures. Confirm you can reproduce the flake.
2. Fix the flaky scenario by applying the isolation discipline. Verify 5 consecutive `--repeat-each 5` runs all pass.
3. Introduce a *new* deliberately flaky scenario — this one relying on a race condition instead of state pollution. (Hint: an assertion right after a click without awaiting the navigation.) Reproduce the flake, then fix it with `waitForURL` or an explicit `expect(locator).toBeVisible()` as a pre-assertion.

## Run it

```bash
npm run e2e:flaky
```

## Compare

```bash
git diff 12-complete -- apps/web-e2e
```

## Cheat sheet

**Playwright config knobs:**

```ts
fullyParallel: true,
workers: 4,              // or '50%' for half of CPU cores
retries: process.env.CI ? 1 : 0,
timeout: 30_000,         // per-test
expect: { timeout: 10_000 },  // per-assertion
```

**Flake-hunting commands:**

```bash
--repeat-each N        # run every selected test N times
--workers 1            # serialize — if it still flakes, it's not parallel-induced
--grep @flaky          # target just the suspect
--trace on             # always record traces
```

**The isolation contract (from Module 07):**

- Unique data names per scenario (`scenarioId` suffix)
- Prefix all E2E data (`E2E_` — enables sweep)
- Track IDs for cleanup
- Never assume serial execution

## Next

→ [Module 13 — Debugging](../13-debugging/README.md)
