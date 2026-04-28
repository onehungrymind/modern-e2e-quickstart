# Module 07 — Network mocking & interception

## What you'll learn

- How `page.route()` intercepts browser network calls
- How to stub specific HTTP responses (error states, slow responses, offline)
- URL matching: globs, regexes, predicate functions
- When to mock (edge cases you can't trigger realistically) vs. seed (happy paths)

## Why it matters

Some scenarios are expensive or impossible to produce against a real backend:

- "What happens if the API returns 500?" — you don't want to actually break your API.
- "What if the response is slow?" — throttling the real network is brittle.
- "What if the token is invalid?" — corrupting real tokens is messy.

`page.route()` gives you a surgical knife: intercept exactly the calls you want, fulfill them however you like, fall back on the real server for everything else.

## Prerequisites

- Module 06 complete
- `git checkout 07-start`

## Walkthrough

### 1. Anatomy of `page.route()`

```ts
await page.route(
  urlPattern,        // string glob, RegExp, or (url: URL) => boolean
  async (route) => { // handler
    // route.request() — the outgoing request
    // route.fulfill(...)  — respond without hitting server
    // route.continue(...) — let it proceed (optionally modified)
    // route.abort(...)    — fail the request
    // route.fallback()    — try the next route handler
  },
);
```

### 2. Stub an error response

`features/projects/network-mock.feature`:

```gherkin
@projects @module-07
Scenario: server error on project list surfaces an error message
  Given an E2E member is logged in
  And the API returns 500 for the projects list
  When I visit the projects page
  Then I see a projects error message
```

`steps/network.steps.ts`:

```ts
Given('the API returns 500 for the projects list', async ({ page }) => {
  await page.route(
    (url) => url.pathname === '/projects' && url.port === '3000',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          message: 'Internal Server Error',
          error: 'Server Error',
        }),
      });
    },
  );
});
```

**URL matching tips:**

- **Globs** (`**/projects`) are handy but match broadly — including requests your web server makes for HTML at the same path.
- **Predicate functions** (`(url) => url.pathname === '/projects' && url.port === '3000'`) are explicit and scale better.
- **RegExp** (`/\/projects\/\d+$/`) when you need pattern-matching.

In this suite we favor predicates — easy to read, easy to scope to the api host.

### 3. Simulate a slow response

```ts
Given(
  'the API takes {int}ms to return the projects list',
  async ({ page }, delayMs: number) => {
    await page.route(
      (url) => url.pathname === '/projects' && url.port === '3000',
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await new Promise((r) => setTimeout(r, delayMs));
        await route.continue();
      },
    );
  },
);
```

Perfect for exercising loading states.

### 4. Mock 401 (authenticated-only)

```ts
Given('the API returns 401 for authenticated requests', async ({ page }) => {
  await page.route(
    (url) => url.port === '3000',
    async (route) => {
      const hasBearer = route.request().headers()['authorization']?.startsWith('Bearer ');
      if (!hasBearer) return route.fallback();
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }),
      });
    },
  );
});
```

Used in `features/auth/expired-session.feature` to prove the global 401 handler redirects to `/login?returnTo=...`.

### 5. When NOT to mock

The instinct to mock grows. Resist it.

- **Happy paths** — seed via API (Module 06), hit the real backend. You catch real bugs that way.
- **Data-shape changes** — don't mock if you can seed. Mocks freeze a snapshot of the API shape; real calls catch drift.
- **Auth** — except for expired-session and similar edge cases, real login is fine (see `storageState`, Module 05).

Mock for:
- Error states (4xx, 5xx)
- Timeout / slow responses
- Third-party APIs you don't control
- "The user is offline" scenarios

## Exercise

1. Write a scenario that intercepts `POST /projects` and returns a 400 validation error. Assert the new-project form surfaces that error and the user stays on the form.
2. Write a scenario that makes `/users` take 2 seconds to return. Assert the `loadingIndicator` POM locator is visible during that window.
3. (Stretch) Write a scenario where *only the third* call to `/projects` fails — first two succeed, third returns 500. Hint: route handlers can maintain state with a closure counter.

## Run it

```bash
npm run e2e -- --grep @module-07
```

## Compare

```bash
git diff 07-complete -- apps/web-e2e
```

## Cheat sheet

**`route.fulfill` options:**

```ts
await route.fulfill({
  status: 500,
  contentType: 'application/json',
  headers: { 'Cache-Control': 'no-store' },
  body: JSON.stringify({ ... }),
});
```

**Other useful methods:**

- `route.continue({ headers, postData })` — let it through, optionally mutated
- `route.abort('failed' | 'internetdisconnected' | ...)` — simulate network error
- `route.fallback()` — skip this handler, try the next registered route

**Scope:** `page.route` lives on the page. A new page in the same context doesn't inherit handlers — use `context.route` for context-wide interception.

**Unroute:** `await page.unroute(pattern)` removes a handler. Usually unnecessary since each scenario gets a fresh context.

## Next

→ [Module 08 — Custom commands & step composition](../08-custom-commands/README.md)
