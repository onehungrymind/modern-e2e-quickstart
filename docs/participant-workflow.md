# Participant workflow — the complete guide

This guide assumes you know almost no git. By the end, you'll know exactly how to start a module, do the work, check your answer, and move to the next one. If you've used git before, skim past the **Glossary** at the bottom.

---

## What you're about to do

The workshop is **13 modules**, numbered `00` through `12`. Each module is a small, focused chunk of work — usually 30 to 60 minutes. You'll write Cucumber feature files, TypeScript step definitions, and Page Objects, and watch a real browser drive the reference app.

Each module has two checkpoints saved as **git tags** (think of tags as named bookmarks):

- **`NN-start`** — the state you begin in. The reference app is fully working, but the test code you're about to write is *missing*. That's intentional — your job is to fill it in.
- **`NN-complete`** — the canonical solution. After you finish your work, you can compare your code against this to see how the reference suite did it.

So `01-start` → you write code → `01-complete` is the answer key. Same pattern for all 12 coding modules. Module `00` is just environment setup with one passing smoke test (no code to write).

---

## One-time setup

Do this **once**, the first time you sit down with the workshop.

### 1. Install Node 20

The repo has a `.nvmrc` file pinning Node 20 LTS. The fastest way is [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 20
nvm use 20
```

Verify:

```bash
node --version
# v20.x.x
```

### 2. Clone the repo and install dependencies

```bash
git clone <this-repo-url>
cd modern-e2e-quickstart
npm ci
```

`npm ci` installs every package the workshop needs. It takes 1–2 minutes.

### 3. Install the headless browser

Playwright drives a real Chrome browser to run your tests. You need to download it once:

```bash
npx playwright install chromium
```

About 150MB. One-time only.

### 4. Switch to the workshop branch

The workshop content lives on a branch called `workshop/main`. (The default `main` branch holds the finished reference suite as a permanent reference — don't worry about it for now.)

```bash
git checkout workshop/main
```

You should see:

```
Switched to branch 'workshop/main'
```

### 5. Verify everything works

Boot the app and run the smoke test:

```bash
npm start
```

This starts two servers:
- **API** at http://localhost:3000 (the backend — NestJS)
- **Web** at http://localhost:4200 (the frontend — React)

Open http://localhost:4200 in a browser. You should see a login page. Sign in with:

| Email | Password |
|---|---|
| `admin@example.com` | `Admin123!` |

If you can log in and see the projects list, your environment is good. Press `Ctrl+C` in the terminal to stop both servers.

You're ready to start.

---

## The four commands you'll use

Everything you do in the workshop boils down to four commands:

| Command | What it does | When to use |
|---|---|---|
| `npm run module:begin NN` | Drops you into Module `NN`, ready to write code | Start of each module |
| `npm run module:compare NN` | Shows the difference between your code and the canonical answer | After you finish a module |
| `npm run module:reset NN` | Throws away your work and starts the module over | When you want a clean slate |
| `npm run module:status` | Tells you where you are right now | When you're confused |

That's it. You can do everything by hand with raw `git` commands, but you don't have to.

---

## Your first module — walked through step by step

Let's do Module 01 together so you see the rhythm. After this, every other module follows the same pattern.

### Step 1: Begin the module

From the project root:

```bash
npm run module:begin 01
```

You'll see:

```
Checking out 01-start and creating branch my/01...
Switched to a new branch 'my/01'

Ready. Open modules/01-first-feature/README.md and follow the walkthrough.
```

What just happened:
- Git moved your code to the `01-start` checkpoint (the reference app is there, the test code is not)
- Git created a new branch called `my/01` where your work will live
- You can mess around on `my/01` as much as you want — it's *your* branch, separate from everything else

If you ever want to confirm where you are:

```bash
npm run module:status
```

You'll see:

```
Branch:       my/01
Nearest tag:  01-start
Working tree: clean

You are on Module 01. Useful commands:
  npm run module:compare 01   # diff vs canonical solution
  npm run module:reset 01     # discard your work, restart module
```

### Step 2: Read the module README

Open the file the script told you about:

```
modules/01-first-feature/README.md
```

Every module README has the same shape:
- **What you'll learn** — the concepts
- **Why it matters** — why you should care
- **Walkthrough** — step-by-step code to write, with explanations
- **Exercise** — a small bit at the end you do on your own
- **Run it** — the command to test your work
- **Compare** — how to check against the canonical answer
- **Cheat sheet** — quick reference

Read the whole thing once, then go back and start writing code. Don't skip the "Why it matters" section — it's the difference between memorizing patterns and understanding them.

### Step 3: Write code

Follow the walkthrough. For Module 01 you'll create two new files:

- `apps/web-e2e/src/features/auth/login.feature` — a Cucumber `.feature` file with three test scenarios
- `apps/web-e2e/src/steps/auth.steps.ts` — the TypeScript code that runs those scenarios

Use any editor you like. The README shows you exactly what to type.

### Step 4: Run the tests

After you've written the code, test it:

```bash
npm run e2e
```

The first time, this will:
1. Boot the API and the Web app (you'll see startup logs scroll by)
2. Compile your `.feature` files into runnable tests
3. Drive a real Chrome browser through your scenarios
4. Print a summary

If everything works, you should see something like:

```
4 passed (9.6s)
```

(Three from your new scenarios plus one pre-existing smoke test.)

If you see failures, the error messages tell you exactly which line of which file went wrong. Read them carefully — they're usually accurate. If you're stuck, check **Step 5** to compare against the canonical answer.

### Step 5: Compare against the canonical solution

When your tests pass (or when you're stuck and need a hint):

```bash
npm run module:compare 01
```

This prints the difference between *your* code and the *canonical* answer. The output uses git's diff format — lines starting with `-` are in the canonical version but not yours, lines starting with `+` are in your version but not the canonical one.

Don't worry if your code doesn't match exactly — there are many right answers. As long as your tests pass, you're good. Use the diff to spot patterns you might want to adopt.

### Step 6: Move to the next module

When you're ready, just begin the next one:

```bash
npm run module:begin 02
```

You'll get a fresh `my/02` branch starting from `02-start`. Your `my/01` branch still exists with all your work — you can come back to it any time with `git checkout my/01`.

That's the whole loop. Repeat for each module 01 through 12.

---

## Recovery recipes — when things go wrong

### "I want to throw away my work and start the module over"

```bash
npm run module:reset 01
```

This wipes your `my/01` branch back to the `01-start` state. Use it when you're tangled up and want a clean slate.

### "I broke something and the tests are doing weird things"

First, check that you're on the right branch:

```bash
npm run module:status
```

If status shows you're not on a `my/NN` branch, you're somewhere off-trail. Get back on track:

```bash
npm run module:begin <module-you-were-on>
```

If status shows the right branch but the tests are still misbehaving, try:

```bash
npm run db:reset
```

This wipes and reseeds the development database. Solves about 70% of "weird state" problems.

### "I want to take a break and come back tomorrow"

Just close your terminal. Your work is saved on the `my/NN` branch. When you come back:

```bash
cd modern-e2e-quickstart
git checkout my/03            # or whatever module you were on
npm run module:status         # confirm where you are
```

### "I want to look at the canonical solution while I work"

Open a second terminal:

```bash
cd modern-e2e-quickstart
git checkout 03-complete
# look around, read files
```

When you're done looking, go back to your work:

```bash
git checkout my/03
```

Don't *edit* files while checked out at `03-complete` — that creates a mess. Just look.

### "I want to see what the finished suite looks like"

```bash
git checkout 12-complete
npm run e2e
```

Runs all 53 scenarios. Takes about 30 seconds. When you're done:

```bash
git checkout my/03   # or wherever you were
```

### "I committed something I didn't mean to"

This happens. The simplest fix:

```bash
git reset --soft HEAD~1
```

Undoes the last commit, keeps the changes. Then you can re-commit, or `git stash` to set them aside.

### "I'm hopelessly lost"

Two paths:

**Reset just the current module** (loses your work on this module only):

```bash
npm run module:reset NN
```

**Wipe everything and start fresh** (loses ALL your work):

```bash
git checkout workshop/main
git branch | grep "my/" | xargs git branch -D
npm run module:begin 01
```

The second option is nuclear — only do it if you're really starting over.

---

## Workflow tips

### Run a single module's tests

`npm run e2e` runs everything. To run just one module's scenarios:

```bash
npm run e2e -- --grep @module-03
```

### Run a single feature file

```bash
npm run e2e -- --grep @auth
```

(Tags are defined inside `.feature` files. Look at the top of any `.feature` for the tags it carries.)

### Watch the tests in a real browser

By default Playwright runs headless (no visible window). To watch:

```bash
npm run e2e:headed
```

You can also run in interactive UI mode:

```bash
npm run e2e:ui
```

This opens a Playwright UI where you can pick scenarios, replay them, and inspect every step.

### See the report after a failed run

```bash
npm run e2e:report
```

Opens an HTML report with screenshots, traces, and per-step output for the most recent run.

---

## Glossary — git terms you'll see

If you've never used git, these terms might be confusing. Here's what they mean in this workshop:

**Repository (or "repo")** — the whole project folder, with its full history.

**Branch** — a separate line of work. You start on `workshop/main`. Each module gives you a `my/NN` branch where you write your own code. Branches don't see each other's changes until you explicitly merge them — but in this workshop, you don't merge anything, so branches are isolated little workspaces.

**Tag** — a permanent bookmark pointing at one specific commit. The 25 workshop tags (`00-setup`, `01-start`, `01-complete`, etc.) are how the script knows where each module's checkpoints are.

**Commit** — a snapshot of all your files at a moment in time. Commits build the project's history.

**Checkout** — switch your working directory to a different snapshot. `git checkout my/03` puts your project files in the state of the `my/03` branch.

**HEAD** — git's pointer to "where you are right now." `git status` and `npm run module:status` both rely on HEAD to figure out where you stand.

**`workshop/main`** — the official workshop branch, where all the tags live. You won't write code directly on this branch — you always do `npm run module:begin NN` first to get a `my/NN` branch.

**`main`** — the canonical reference suite, untouched by the workshop. You can ignore it.

**Working tree** — the actual files in your folder right now. "Clean" means everything is saved; "dirty" means you have unsaved changes.

---

## What if I want to do this without `npm run module:*`?

The `module:*` scripts are convenience wrappers around `git`. Here's the equivalent for each:

| npm script | Plain git equivalent |
|---|---|
| `module:begin 03` | `git checkout 03-start && git checkout -b my/03` |
| `module:compare 03` | `git diff 03-complete -- apps/web-e2e` |
| `module:reset 03` | (must be on `my/03`) `git reset --hard 03-start` |
| `module:status` | `git rev-parse --abbrev-ref HEAD && git describe --tags --abbrev=0` |

Use whichever you prefer.

---

## Next

Open [`modules/00-setup/README.md`](../modules/00-setup/README.md) and start there. Then `npm run module:begin 01` and go.
