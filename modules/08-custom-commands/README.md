# Module 08 — Custom commands & step composition

## What you'll learn

- How to build composite "meta-steps" that bundle setup into one line
- When a composite step is clearer than POM helpers (and vice versa)
- The trade-off between reusability and readability in Gherkin

## Why it matters

Feature files should read like product specs, not test runbooks. Compare:

```gherkin
# Noisy
Given an E2E member user "alice" exists
And the user "alice" has logged in via the UI
And the page has loaded
When I visit the projects page

# Composite
Given I am logged in as "alice"
When I visit the projects page
```

Same test, half the cognitive load. That's what this module teaches.

## Prerequisites

- Module 07 complete
- `git checkout 08-start`

## Walkthrough

### 1. The composite step

A single step that orchestrates multiple fixtures. From `steps/auth-session.steps.ts`:

```ts
Given('I am logged in as {string}', async ({ session }, role: string) => {
  await session.loadStorageStateForRole(role as E2ERole);
});
```

One line in the feature file bundles: clear cookies → load storageState file → inject localStorage → (implicitly) be on the same origin with a valid session.

From the reader's perspective, it's "log in as alice" and continue.

### 2. The role-parameterized composite

Because `loadStorageStateForRole` takes the role as data, one step function covers all three roles:

```gherkin
Scenario: admin's profile page shows admin role
  Given I am logged in as "admin"
  When I open "/profile"
  Then my profile shows role "admin"

Scenario: alice's profile page shows member role
  Given I am logged in as "alice"
  When I open "/profile"
  Then my profile shows role "member"
```

One step def. Three roles. No copy-paste.

### 3. The "E2E member is logged in" composite

Sometimes you want a *fresh* user, not a baseline role. `Given an E2E member is logged in`:

```ts
Given('an E2E member is logged in', async ({ session, scenarioWorld, seedUser }) => {
  const user = await seedUser({ role: 'member' });
  scenarioWorld.seededUser = user;
  await session.setStoredAuth(user);
});
```

It bundles: seed a fresh E2E_ user via API → set `scenarioWorld.seededUser` (so later steps can look up the current user) → write auth to localStorage. One line in Gherkin.

### 4. POM method vs. composite step — choosing

Both are ways to DRY up repeated sequences. Pick by asking "whose vocabulary?"

- **POM method** — when the abstraction is about *the page*. Example: `projectsListPage.createProject(name, description)`. Inside the POM, not exposed as a step.
- **Composite step** — when the abstraction is about *the scenario's narrative*. Example: `Given I am logged in as "alice"`. Crosses page/session/data-seed boundaries.

Rule of thumb: if it's a single UI interaction, it's a POM method. If it crosses concerns (API + UI + session), it's a composite step.

### 5. Avoid over-composition

Composite steps can go too far. Don't write:

```gherkin
Given my project has been set up
```

Where "set up" means: create user, create project, create 3 tasks, navigate, etc. The reader can't tell what the preconditions are. Now failures become "something in the magic setup broke".

**The test:** a new engineer reads the scenario. Do they understand what's being tested, just from the Gherkin? If the step hides the thing under test, it's too composite.

## Exercise

1. Write a composite step: `Given a project "{string}" with {int} tasks`. It should seed the project and N tasks via the API under the current user, generating distinct task titles.
2. Rewrite one of your existing multi-`Given` scenarios to use your new composite. Measure: does it read better? Is it still clear what's being tested?
3. Intentionally write a *bad* composite (one that hides too much). Commit it, then delete it. That deletion is the teaching commit.

## Run it

```bash
npm run e2e -- --grep @module-08
```

## Compare

```bash
git diff 08-complete -- apps/web-e2e
```

## Cheat sheet

**Composite step shape:**

```ts
Given('high-level narrative sentence', async ({ fixtureA, fixtureB, scenarioWorld }, ...) => {
  // orchestrate multiple fixtures, mutate scenarioWorld if needed
});
```

**When to compose:**

- Multiple prerequisite `Given`s appear together in 3+ scenarios → consider a composite
- A step crosses concerns (UI + session + API) → probably a composite
- Narrative clarity suffers without it → definitely a composite

**When NOT to compose:**

- The hidden sequence IS the test — don't bundle it into a Given
- It's about one page → use a POM method
- You'd need 7 parameters to configure the composite → split it

## Next

→ [Module 09 — Parallel, retries, flake](../09-parallel-retries-flake/README.md)
