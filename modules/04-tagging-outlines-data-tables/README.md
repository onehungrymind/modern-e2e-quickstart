# Module 04 — Tagging, scenario outlines, data tables

## What you'll learn

- How to tag scenarios and filter with `--grep` / `--grep-invert`
- `Scenario Outline` + `Examples:` — run one scenario shape against many inputs
- Gherkin data tables — pass structured payloads into a step
- When to reach for each pattern

## Why it matters

Without tags you can't run "just the smoke tests" or "everything except the flaky demo". Without outlines, testing 5 variations of "bad login" means copy-pasting a scenario 5 times. Without data tables, seeding a project with 3 tasks becomes 3 separate `Given` steps.

These three features make feature files *actually* maintainable.

## Prerequisites

- Module 03 complete
- `git checkout 04-start`

## Walkthrough

### 1. Tags

Feature-level tags apply to every scenario; scenario-level tags add on top.

```gherkin
@auth @module-04
Feature: Login input validation

  @smoke                  # this scenario is @auth @module-04 @smoke
  Scenario: rejects wrong password
    ...
```

Run subsets:

```bash
# Everything tagged @smoke
npm run e2e -- --grep @smoke

# Exclude @flaky
npm run e2e -- --grep-invert @flaky

# Both: @auth AND NOT @flaky
npm run e2e -- --grep @auth --grep-invert @flaky
```

Recommended vocabulary for this workshop:

- **Domain:** `@auth`, `@projects`, `@tasks`, `@users`
- **Module:** `@module-01` … `@module-12`
- **Behavior:** `@smoke`, `@anonymous`, `@flaky`, `@destructive`

Keep the list small; tag explosion is its own problem.

### 2. Scenario Outlines

Repeated-shape scenarios collapse into one outline:

```gherkin
@auth @module-04
Feature: Login input validation

  Background:
    Given a seeded E2E member user

  Scenario Outline: login rejects bad credentials
    Given I am on the login page
    When I sign in with email "<email>" and password "<password>"
    Then I see the error "<message>"

    Examples:
      | email                 | password      | message                    |
      | unknown@example.com   | Password1!    | Invalid email or password  |
      | not-an-email          | Password1!    | Invalid email or password  |
```

Each row in `Examples:` runs the scenario once, substituting `<placeholder>` tokens. You get two test cases from one source of truth.

### 3. Data tables

When a single step needs structured input:

```gherkin
Scenario: seed a project with a table of tasks
  Given a project "Planning Session" seeded via the API for the current user with tasks:
    | title                 | status  | priority |
    | Draft agenda          | todo    | high     |
    | Book conference room  | doing   | medium   |
    | Send invites          | done    | medium   |
```

The step def receives a `DataTable`:

```ts
import { DataTable } from 'playwright-bdd';

Given(
  'a project {string} seeded via the API for the current user with tasks:',
  async ({ scenarioWorld, seedProject, seedTask }, name: string, table: DataTable) => {
    const user = scenarioWorld.seededUser!;
    const project = await seedProject({ ownerId: user.id, name });
    for (const row of table.hashes()) {
      await seedTask({
        projectId: project.id,
        title: row['title'],
        status: row['status'] as 'todo' | 'doing' | 'done',
        priority: row['priority'] as 'low' | 'medium' | 'high',
      });
    }
  },
);
```

`table.hashes()` returns an array of row objects keyed by header. `table.raw()` gives you a 2D array if you want positional access.

### 4. Choosing between outline and data table

- **Outline** — you're running the *same scenario* with different inputs. Each row is a test.
- **Data table** — a *single scenario* needs a structured payload. The whole table is one test.

If in doubt: "do I want N test results from this, or 1?"

## Exercise

1. Tag every scenario you've written so far with `@module-NN` for the module that introduced it.
2. Convert one of your existing "happy path login" scenarios into a `Scenario Outline` with three rows: admin / alice / bob credentials.
3. Add a new scenario that seeds a project with a data table of at least 4 tasks covering every status. Assert all titles are visible on the project detail page.

## Run it

```bash
npm run e2e -- --grep @module-04
```

## Compare

```bash
git diff 04-complete -- apps/web-e2e
```

## Cheat sheet

**Filtering commands:**

```bash
npm run e2e:smoke       # @smoke
npm run e2e:auth        # @auth
npm run e2e:projects    # @projects
# anything not pre-wired:
npm run e2e -- --grep @module-07
npm run e2e -- --grep-invert @flaky
```

**Outline placeholder syntax:** `<name>` in step text, `| name |` as column header.

**Data table access:**

```ts
table.hashes()  // [{header1: 'val', header2: 'val'}, ...]
table.raw()     // [['header1', 'header2'], ['val', 'val'], ...]
table.rows()    // 2D array minus the header row
```

## Next

→ [Module 05 — Auth & storage state](../05-auth-storage-state/README.md)
