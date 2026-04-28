# CLAUDE.md — modern-e2e-quickstart

This file is loaded into every Claude Code session in this repo. Keep it short.

**Source of truth for the build plan is `PLAN.md`.** Read it once per session. This file only captures durable rules that must survive across sessions.

---

## Subagent model selection

When spawning subagents via the `Agent` tool, **pass `model: "sonnet"`** for:

- Scaffolding / boilerplate (Nx generators, Prisma models, NestJS modules)
- Writing page objects, step definitions, fixtures, seed helpers
- Writing module README content from a given outline
- Codebase exploration (`Explore` subagent)
- Any task where the approach is decided and execution is mechanical

Use the parent Opus model for architectural decisions, ambiguous spec resolution, and cross-cutting reviews. Default is Sonnet — escalate only when needed.

---

## Locked stack (from PLAN.md §2)

npm · Node 20 LTS (pinned via `.nvmrc` + `engines`) · Nx · React+Vite · NestJS · SQLite via Prisma · JWT (Bearer, pinned secret, no refresh) · REST · Tailwind · TypeScript · `playwright-bdd` (not `@cucumber/cucumber`) · MIT.

**Module system:** ESM in `apps/web` + `apps/web-e2e`. CJS in `apps/api` (Nx + NestJS default). No bash — all repo scripts are `.mjs`.

**Platform:** macOS + Linux first-class; Windows via WSL2 only.

**Browsers:** Chromium only.

**Exclusions (v1):** no CI, no visual regression, no a11y tests, no Docker, no multi-browser matrix, no native Windows, no `libs/` shared code.

---

## Test isolation — the core pattern

E2E tests **never touch real data and never leave behind data.** Mechanics:

- All E2E-created data is prefixed `E2E_` (e.g., `E2E_admin@example.com`, `E2E_<scenario-id>_ProjectName`).
- Dev seed (`apps/api/prisma/seed.ts`) creates `admin@example.com`/`alice@example.com`/`bob@example.com` for developer convenience. E2E tests **do not use these users.**
- E2E suite uses env-guarded endpoints: `POST /test/seed/user`, `POST /test/seed/project`, `POST /test/seed/task`, `POST /test/reset`. Route module is disabled when `NODE_ENV === 'production'`.
- Typed seed helper library in `apps/web-e2e/support/seed/` composes granular endpoints. Example: `seedProjectWithTasks({ owner: 'admin', tasks: 3 })` returns `{ project, tasks }` with known IDs.
- **Primary cleanup:** `After` hooks delete IDs tracked in the scenario's World.
- **Belt & suspenders:** `globalSetup` and `globalTeardown` call `/test/reset` which sweeps `DELETE WHERE name/email LIKE 'E2E_%'`.
- JWT secret pinned in `.env` / `.env.example` so cached `storageState` survives reruns.

---

## Locator strategy (PLAN.md §3.5)

Layered priority: **role → label → text → testid → scope+filter**.

- `getByRole('button', { name: 'Save' })` for buttons/links/form controls with visible labels.
- `getByLabel('Email')` for form fields.
- `getByTestId('projects-list-empty-state')` for structural elements without a natural role.
- `getByTestId('projects-list').getByRole('listitem').filter({ hasText: seeded.name })` for selecting specific list items.

**No dynamic IDs baked into test-IDs.** Row selection uses content filters on scenario-unique `E2E_<id>_` names, never `projects-list-item-{cuid}`.

**Test-ID format when used:** `{page-or-feature}-{component}-{role-or-action}`, kebab-case.

---

## Workshop delivery model

Linear `main`, tagged commits: `00-setup → 01-start → 01-complete → ... → 12-complete`. Tags are rebuilt from `scripts/modules.manifest.json` via `scripts/rebuild-tags.mjs` (Node, not bash).

**Participant workflow** via `scripts/module.mjs`:
- `npm run module:begin NN` — checkout `NN-start`, create `my/NN` branch
- `npm run module:compare NN` — diff `my/NN` against `NN-complete`
- `npm run module:reset NN` — hard reset `my/NN` (recovery)
- `npm run module:status` — current module + branch + dirty state

Do NOT create per-module branches in the canonical history. Do NOT commit module work directly against `main` during Phase A/B — the tag sequence is rebuilt in Phase C from the manifest.

---

## Coding conventions (PLAN.md §9)

- No premature abstractions. Helper on the fourth repetition, not the second.
- No comments describing *what* code does. Comment only non-obvious *why*.
- Error handling at system boundaries only (HTTP input, external APIs). Trust internal code.
- File naming: kebab-case for components/modules, PascalCase for page-object classes.
- Imports: absolute paths via `tsconfig.base.json` `paths` when crossing `apps/`.

---

## Phase discipline

Phase **A** (reference app) → **B.1** (E2E vertical slice) → **B.2** (fill out in curriculum order) → **C** (READMEs + tags) → **D** (polish + dry run).

**Gate policy:**
- A → B.1: **open** (B.1 is the automated smoke)
- B.1 → B.2: **open** (B.2 is additive)
- B.2 → C: **closed — stop and ask** (history rewrite + teaching judgment)
- C → D: **closed — stop and ask** (D requires a human participant)

- Phase A verification: B.1's vertical slice replaces the manual smoke script. If B.1 passes green twice in a row, Phase A is proven.
- Phase B exit: `npx nx e2e web-e2e` green twice in a row in **under 120s** (target 90s).
- Phase B.2 rule: do not reach for future-module features early. Module 01 scenarios can't use Module 05's `storageState`.
- Hard blockers: Phase A step 0 ESM/CJS spike failure, any §2 deviation, or any unresolvable version incompatibility — stop and flag, don't improvise.

---

## Things not to decide unilaterally

If you hit any of these, stop and ask:

- Any deviation from §2 locked decisions
- Scope additions beyond §2 exclusions
- Changes to the 12-module sequence in §6
- Changes to the E2E isolation pattern (the `E2E_` prefix + seed helpers + cleanup discipline)

---

*End of CLAUDE.md.*
