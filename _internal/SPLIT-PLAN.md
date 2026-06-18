# SPLIT-PLAN — modules 05/06 → 05–09 (15 modules total)

Working doc for branch `split-modules-05-06`. Internal; may be removed before merge.

## Goal
Split the two outlier modules so no module exceeds ~40 min, and deepen their READMEs
so every produced file is taught. Renumber old 07–12 → 10–15. End state apps/ code is
byte-identical to old `main` tip **except `@module-NN` tag values** in feature files.

## Hard rules
- Every new `NN-complete` checkout must be **independently green** (`@module-NN` scenarios pass,
  or — for infra-only module 05 — the documented deliverable verifies).
- `modules/` tree is curriculum text, constant across all commits (planted at the new root).
- No squash on merge (tags rebuilt from manifest SHAs post-merge) — or regen manifest by subject.

## Old → new numbering
| old | new | title |
|--|--|--|
| 05 (split) | 05 | Storage state: log in once (infra) |
|            | 06 | Using sessions in scenarios |
| 06 (split) | 07 | The /test seam + seed fixtures |
|            | 08 | Projects & tasks with the hybrid pattern |
|            | 09 | Users + isolation proof |
| 07 | 10 | Network mocking & interception |
| 08 | 11 | Custom commands / step composition |
| 09 | 12 | Parallel, retries, flake |
| 10 | 13 | Debugging |
| 11 | 14 | Reporting |
| 12 | 15 | Env config + capstone |

## CODE CARVE (cumulative checkpoints; final tree == old tip w/ retagged @module)

### old 05c (e58cd29) → new 05 + 06
**new 05 — login once (infra; NO scenario; deliverable = .auth/*.json produced):**
- support/env.ts
- support/seed/index.ts  (full file — reset+user+project+task needed by setup & later)
- support/global-setup.ts
- support/global-teardown.ts
- playwright.config.ts: add `testDir`, `globalSetup`, `globalTeardown`
README "Run it": `npm run e2e:bdd:gen && npx nx e2e web-e2e` then inspect `.auth/{admin,alice,bob}.json`.

**new 06 — using sessions (all consuming auth scenarios green):**
- support/session.ts
- pages/app-shell-page.ts
- pages/login-page.ts changes (expectOnLoginPage, expectReturnToParam)
- fixtures/test.ts: add appShell + session fixtures
- steps/auth-session.steps.ts MINUS the `an E2E member is logged in` step (that uses seedUser → defer to 07)
- steps/auth.steps.ts edits (remove dup sign-in step, etc.)
- features: storage-state.feature (retag → @module-06, drop @module-08), anonymous.feature (→06),
  protected-routes.feature (→06), logout.feature (retag @module-01 → @module-06)
NOTE: keep `an E2E member is logged in` OUT of 06 so no undefined-fixture reference.

### old 06c (897c2d1) → new 07 + 08 + 09
**new 07 — seam + seed fixtures (project-crud signature scenario green):**
- support/api-client.ts changes
- fixtures/test.ts: seedUser/seedProject/seedTask/projectWithTasks fixtures + scenarioWorld cleanup
- steps/auth-session.steps.ts: ADD `an E2E member is logged in` (now seedUser exists)
- pages/projects-list-page.ts changes, pages/project-detail-page.ts
- steps/projects.steps.ts (project open/create + resolveProjectName)
- features/projects/project-crud.feature (→ @module-07)
- features/auth/login.feature, login-extra.feature, login-outline.feature edits if part of 06c (retag stays @auth/@module-04/01 as appropriate — verify)

**new 08 — projects & tasks build-out (these scenarios green):**
- pages/task-form.ts
- steps/tasks.steps.ts, steps/extra.steps.ts (the non-user parts), projects.steps.ts remainder
- features/projects/list-search, create-validation, ownership (→ @module-08)
- features/tasks/task-crud, task-filter, task-assignee (→ @module-08)

**new 09 — users + isolation proof (users scenarios green):**
- pages/users-list-page.ts, pages/user-detail-page.ts, pages/profile-page.ts
- steps/extra.steps.ts (user/profile parts) — carve from 08 if needed
- features/users/users.feature (→ @module-09)
- README adds the --repeat-each/--workers isolation exercise (no new code required)

### old 07c–12c → new 10–15 (replay; bump @module-NN +3 in any feature they add)
- 07c→10: features/projects/network-mock, network-slow, auth/expired-session → @module-10 (expired-session was mis-tagged @module-05)
- 08c→11: auth/roles.feature → @module-11
- 09c→12: flaky.feature → @module-12
- 10c→13, 11c→14: no feature retags (debug/report)
- 12c→15: tasks/capstone-due-dates.feature → @module-15

## Reconstruction mechanism
1. New root = old root (62ba75d) tree with `modules/` subtree replaced by new 15-module curriculum
   + README.md/docs count edits. (commit-tree or amend on detached HEAD)
2. Cherry-pick 01c–04c (apps-only; no conflict with modules swap).
3. Carve 05c: `cherry-pick -n e58cd29`, then 2 commits via selective `git add`.
4. Carve 06c: `cherry-pick -n 897c2d1`, then 3 commits via selective `git add`.
5. Cherry-pick 07c–12c; for each, sed-retag newly-added feature files (+3 / fixes above); commit.
6. Trailing commit: finalize manifest with new SHAs; (docs already at root).
7. Verify: each tag tree coherent; `npx nx e2e web-e2e` green twice <120s at tip;
   sample `module:begin`/`compare`.

## Reconstruction recipe (deterministic blob-assembly) — REFINED
Blob sources: OLD05 = e58cd29 (old 05-complete), OLD06 = 897c2d1 (old 06-complete).
Multi-touch files in carve region: fixtures/test.ts (OLD05 adds session fixtures, OLD06 adds seed
fixtures), auth.steps.ts (edited by both). Their checkpoint state = the blob at OLD05 / OLD06.
All other carve files are single-touch → copy their OLD05/OLD06 blob verbatim.

Build forward; each step `git checkout <SRC> -- <paths>` then hand-edit specials, then commit:
- **05** (base = 04-complete eab4dcd): add support/env.ts, support/seed/index.ts,
  support/global-setup.ts, support/global-teardown.ts, playwright.config.ts — all from OLD05.
  (fixtures/test.ts, auth.steps.ts stay at 04-complete.) No scenarios. Green: existing 04 scenarios.
- **06**: from OLD05 add support/session.ts, pages/app-shell-page.ts, pages/login-page.ts,
  fixtures/test.ts (OLD05 blob = session fixtures only), auth.steps.ts (OLD05 blob),
  auth-session.steps.ts (OLD05 blob **minus** the `an E2E member is logged in` step → hand-trim),
  features auth/{anonymous,protected-routes,logout,storage-state}.feature → **retag all to @module-06**
  (storage-state: drop @module-08; logout: @module-01→@module-06). After 06, apps ≈ OLD05.
- **07**: from OLD06 add support/api-client.ts, fixtures/test.ts (OLD06 = +seed fixtures),
  auth-session.steps.ts (OLD06 blob = step restored), auth.steps.ts (OLD06), projects.steps.ts (OLD06),
  pages/projects-list-page.ts (OLD06), pages/project-detail-page.ts (OLD06),
  features/auth/{login,login-extra,login-outline}.feature (OLD06 edits, keep tags),
  features/projects/project-crud.feature (OLD06) → **retag @module-07**.
- **08**: from OLD06 add pages/task-form.ts, steps/tasks.steps.ts (OLD06),
  steps/extra.steps.ts **carved**: OLD06 blob with the user/profile steps removed + no user/profile-page
  imports (those land in 09), projects.steps.ts already in 07,
  features projects/{list-search,create-validation,ownership} + tasks/{task-crud,task-filter,task-assignee}
  → **retag @module-08**.
- **09**: from OLD06 add pages/{users-list-page,user-detail-page,profile-page}.ts,
  steps/extra.steps.ts (full OLD06 blob = user/profile steps restored),
  features/users/users.feature → **retag @module-09**. README adds isolation exercise (no code).
  After 09, apps tree == OLD06 apps tree EXCEPT @module tag values. (assert this!)
- **10–15**: cherry-pick OLD 07c..12c (ff03311,c2f6b12,012f99d,8dc4680,cf73020,6579648). Retag features
  they ADD: 10 expired-session/network-* → @module-10; 11 roles → @module-11; 12 flaky → @module-12;
  15 capstone-due-dates → @module-15.

Full-history rewrite from new root (so new modules/ + counts present at every commit):
root' = 62ba75d tree w/ modules/ ← _staging-modules + README/docs count edits; replay 01c–04c;
then 05–09 recipe; then 10–15 cherry-picks; tip commit finalizes manifest. modules/ untouched by any
code commit, so it persists from root'. Fold meta commits (756738f manifest, 9e22c92 counts,
2a46c3a consolidation) into the curriculum/manifest tip work — check they carry no other content.

VERIFY (server-free) before e2e: `git diff <new-09> 897c2d1 -- apps/web-e2e` should show ONLY @module
tag line changes. Then e2e green twice at tip.

## Manifest / tags
25 start/complete tags + 00-setup. start tag = prior complete SHA. Build manifest AFTER commits exist.
Post-merge: run `node scripts/rebuild-tags.mjs`.
