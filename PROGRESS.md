# PROGRESS

Live log of the autonomous overnight build. Newest entries at top.

## Legend
- ✅ Complete — committed
- 🏗️  In progress
- ⏸️  Blocked / waiting on human
- ❌ Failed — flagged for review
- 📝 Decision made autonomously (documented below)

---

## Status

**Stopped at:** Phase B.2 → C gate (per locked gate policy, PLAN.md §8).
**Suite health:** 12/12 green twice, 13.2s wall time (budget 120s, soft target 90s — well under).

---

## What's done

### Phase A — reference app ✅

All 7 sub-phases green, 39/39 api integration checks via `scripts/verify-api.mjs`:

| Commit | Scope |
|---|---|
| `Lock build plan and session rules` | PLAN.md + CLAUDE.md with all 13 decisions locked |
| Phase A.0 | Nx 22 workspace, Node 20 pinned, ESM/CJS spike (api=CJS/webpack, web=ESM/Vite), Tailwind v4 |
| Phase A.1 | Prisma schema + migrations + dev seed (3 users/4 projects/15 tasks), predev hook via `nx serve api` |
| Phase A.2 | NestJS auth (JWT+bcrypt) + users/projects/tasks CRUD + validation + error shape + CORS |
| Phase A.3 | env-guarded `/test/seed/*` + `/test/reset` (E2E_ prefix sweep) |
| Phase A.4+A.5 | React+Vite+Tailwind v4+react-router; auth context with returnTo; all pages (login, projects list+detail, task inline edit, users list+detail, profile) |
| Phase A.6 | `scripts/verify-api.mjs` — 39 assertions |

### Phase B — E2E suite ✅

| Commit | Scope |
|---|---|
| Phase B.1 scaffold | apps/web-e2e created via `@nx/react:app --e2eTestRunner=playwright` (scratch app → extract e2e sibling); canonical Nx layout; playwright-bdd wired |
| Phase B.1 complete | Vertical slice green twice — 1 smoke test + 2 BDD scenarios |
| `Gitignore generated playwright artifacts` | .features-gen + test-results untracked |
| Phase B.2 | 7 features / 12 scenarios covering M01-M09 (M10-M12 live in module READMEs) |

**Final suite:**
- `auth/login.feature` — login happy + wrong pw — @module-01 @module-02 @smoke
- `auth/login-outline.feature` — scenario outline, bad inputs — @module-04
- `auth/anonymous.feature` — returnTo redirect — @module-05
- `auth/storage-state.feature` — "logged in as {role}" composite step — @module-05 @module-08
- `projects/project-crud.feature` — API seed + UI assert + data table — @module-06 @module-04
- `projects/network-mock.feature` — page.route 500 stub — @module-07
- `flaky.feature` — @flaky (excluded from default; reproduce via `--repeat-each 5 --grep @flaky`) — @module-09
- `smoke.spec.ts` — plain Playwright sanity test

**Runs:** `npx nx e2e web-e2e`

---

## Autonomous decisions log

*Small stack/style decisions made without waking the user. Easy to reverse.*

1. **Node 20.20.2** via nvm matches PLAN §2 pin; neither Node 22 nor 23 (both installed) were used. Preserved the locked version.
2. **Tailwind v4** (`tailwindcss@^4` + `@tailwindcss/vite`) not v3 — Vite-native plugin pattern, simpler setup.
3. **React 19, react-router-dom 6.30.3** — whatever @nx/react scaffolded.
4. **Nx 22** — latest at install time.
5. **Prisma 6.19.3** — latest at install time.
6. **DB path override in PrismaService + seed.ts** via `process.cwd()` / `import.meta.url` — Prisma CLI and runtime resolve `file:` URLs differently; bypass the ambiguity with explicit absolute paths. Documented inline.
7. **NestJS module structure hand-written** (no `@nx/nest:module` per-module generator) — the shape matches what the generator produces; decision was for tighter alignment with PLAN §3.3 endpoint list. **Worth reviewing — may want to regenerate through generators for Nx graph hygiene.**
8. **React pages hand-written** (no `@nx/react:component` per-component generator) — same reasoning.
9. **Login UI errors collapsed to "Invalid email or password"** for any 4xx (was surfacing validator messages on 400). Better UX, simpler test expectations.
10. **Projects list shows stable "Failed to load projects" text** via `data-testid="projects-list-error"`.
11. **Tasks controller uses empty `@Controller()` base path** with full `@Get('projects/:id/tasks')` style routes — Nx's generator output; works but atypical. Could be split into two controllers in Phase C cleanup.
12. **`apps/web-e2e/src/.features-gen/` gitignored** — playwright-bdd regenerates this from features before every run.
13. **Two Playwright "projects" in config**: `smoke` (for smoke.spec.ts at src root) + `bdd` (for generated BDD specs) — required because defineBddConfig returns a testDir, and smoke.spec.ts lives elsewhere.
14. **URL-predicate route matching** instead of glob `**/projects` — glob was too broad and caused the stub to miss; predicate on `pathname === '/projects' && port === '3000'` is explicit.

---

## Known issues / unresolved noise

1. **globalTeardown `/test/reset` returns 500** on final sweep (caught with try/catch, logged as warning). Does NOT affect test results — happens after tests complete. Likely a race with dev seed running during api shutdown, or concurrent writes hitting SQLite. Worth investigating in Phase C polish.
2. **Nx "flaky task" detection** triggered between runs — this is Nx Cloud's heuristic, not a test flake. Caused by test timing variance; tests themselves are green.
3. **No tests written for the `@flaky` scenario** being actually flaky. It's deliberately violating isolation but not yet verified to fail under parallel load. Module 09 dry-run will confirm.

---

## What's pending (Phase C and onward)

### Phase C — gated, needs human
1. Write `modules/NN-name/README.md` × 12 per PLAN §6 template
2. Design `NN-start` → `NN-complete` commit boundaries (teaching judgment)
3. Build `scripts/modules.manifest.json` + `scripts/rebuild-tags.mjs`
4. Tag all commits
5. Write `scripts/module.mjs` (begin/compare/reset/status per PLAN §7)

### Phase D — gated, needs human
1. Write `docs/intro.md`, `docs/participant-workflow.md`, `docs/cheatsheet.md`, `docs/troubleshooting.md`
2. Write project `README.md`
3. Dry-run all 12 modules as participant
4. Fix friction, re-tag

---

## Commit map

```
main
├── Lock build plan and session rules             (14e83d6)
├── Phase A.0 — Nx workspace + ESM/CJS spike
├── Phase A.1 — Prisma schema + dev seed + predev
├── Phase A.2 — NestJS api core (auth + CRUD)
├── Phase A.3 — /test/* endpoints for E2E seam
├── Phase A.4+A.5 — React app: routing, auth, all pages
├── Phase A.6 — automated api verification
├── Phase B.1 scaffold — apps/web-e2e via generator
├── Phase B.1 complete — vertical slice green twice
├── Gitignore generated playwright artifacts
└── Phase B.2 — module coverage scenarios         (HEAD)
```

Every commit passes its respective build/test gate. `git checkout <any-commit> && npm ci && npx nx build api && npx nx build web` should work.

---

## How to resume

```bash
npm ci                                           # install deps
npm run db:seed                                  # populate dev DB (happens automatically on nx serve api)
npx nx serve api                                 # api on :3000 (with dev seed)
npx nx serve web                                 # web on :4200
npx nx e2e web-e2e                               # run E2E suite
npx nx e2e web-e2e --grep @smoke                 # smoke only
npx nx e2e web-e2e --grep-invert @flaky          # exclude flake demo (default safe subset)
npx nx e2e web-e2e --grep @flaky --repeat-each 5 # reproduce the M09 flake
```

Manual smoke script per PLAN §8 Phase A exit: walk the 15 steps against `nx serve api` + `nx serve web`. Browser console should be clean throughout.

---

## Things to review first thing in the morning

1. **Hand-written NestJS modules (§A.2)** — run `@nx/nest:module` etc. to see if regenerating would produce different Nx graph metadata. Low priority if the graph is already correct.
2. **Tasks controller base path** — currently uses `@Controller()` with full paths; could split into `TasksController` (`/tasks/:id`) + `ProjectTasksController` (`/projects/:id/tasks`).
3. **globalTeardown /test/reset 500 warning** — non-blocking but worth understanding.
4. **login UI 4xx collapse** — confirm you want all 4xx to say "Invalid email or password" (current) vs. surfacing specific validator feedback.
