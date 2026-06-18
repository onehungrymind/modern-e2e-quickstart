import { test as base, createBdd } from 'playwright-bdd';
import { randomBytes } from 'node:crypto';
import { seed, type SeededUser, type SeededProject, type SeededTask } from '../support/seed';
import { apiRequest } from '../support/api-client';
import { LoginPage } from '../pages/login-page';
import { ProjectsListPage } from '../pages/projects-list-page';
import { ProjectDetailPage } from '../pages/project-detail-page';
import { AppShellPage } from '../pages/app-shell-page';
import { SessionHelper } from '../support/session';

type ScenarioWorld = {
  scenarioId: string;
  seededUser?: SeededUser;
  seededProject?: SeededProject;
  createdUserIds: string[];
  createdProjectIds: string[];
  createdTaskIds: string[];
  projectNames: Map<string, string>;
  taskNames: Map<string, string>;
};

type Fixtures = {
  scenarioWorld: ScenarioWorld;
  seedUser: (input?: Parameters<typeof seed.user>[0]) => Promise<SeededUser>;
  seedProject: (input: Parameters<typeof seed.project>[0]) => Promise<SeededProject>;
  seedTask: (input: Parameters<typeof seed.task>[0]) => Promise<SeededTask>;
  appShell: AppShellPage;
  loginPage: LoginPage;
  projectsListPage: ProjectsListPage;
  projectDetailPage: ProjectDetailPage;
  session: SessionHelper;
};

export const test = base.extend<Fixtures>({
  scenarioWorld: async ({}, use) => {
    const world: ScenarioWorld = {
      scenarioId: randomBytes(4).toString('hex'),
      createdUserIds: [],
      createdProjectIds: [],
      createdTaskIds: [],
      projectNames: new Map(),
      taskNames: new Map(),
    };
    await use(world);
    for (const id of world.createdTaskIds) {
      try {
        await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
      } catch {
        // globalTeardown sweeps E2E_ data as belt-and-suspenders
      }
    }
    for (const id of world.createdProjectIds) {
      try {
        await apiRequest(`/projects/${id}`, { method: 'DELETE' });
      } catch {
        // ditto
      }
    }
  },

  seedUser: async ({ scenarioWorld }, use) => {
    await use(async (input = {}) => {
      const u = await seed.user(input);
      scenarioWorld.createdUserIds.push(u.id);
      scenarioWorld.seededUser = u;
      return u;
    });
  },

  seedProject: async ({ scenarioWorld }, use) => {
    await use(async (input) => {
      const baseName = input.name ?? 'project';
      const uniqueName = `${baseName}_${scenarioWorld.scenarioId}`;
      const p = await seed.project({ ...input, name: uniqueName });
      scenarioWorld.createdProjectIds.push(p.id);
      scenarioWorld.seededProject = p;
      scenarioWorld.projectNames.set(baseName, p.name);
      return p;
    });
  },

  seedTask: async ({ scenarioWorld }, use) => {
    await use(async (input) => {
      const baseTitle = input.title ?? 'task';
      const uniqueTitle = `${baseTitle}_${scenarioWorld.scenarioId}`;
      const t = await seed.task({ ...input, title: uniqueTitle });
      scenarioWorld.createdTaskIds.push(t.id);
      scenarioWorld.taskNames.set(baseTitle, `E2E_${uniqueTitle}`);
      return t;
    });
  },

  appShell: async ({ page }, use) => {
    await use(new AppShellPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  projectsListPage: async ({ page }, use) => {
    await use(new ProjectsListPage(page));
  },

  projectDetailPage: async ({ page }, use) => {
    await use(new ProjectDetailPage(page));
  },

  session: async ({ page, context }, use) => {
    await use(new SessionHelper(page, context));
  },
});

export const expect = test.expect;
export const { Given, When, Then } = createBdd(test);

export function resolveProjectName(world: ScenarioWorld, baseName: string): string {
  return world.projectNames.get(baseName) ?? baseName;
}

export function resolveTaskTitle(world: ScenarioWorld, baseTitle: string): string {
  const withoutPrefix = baseTitle.replace(/^E2E_/, '');
  return world.taskNames.get(withoutPrefix) ?? baseTitle;
}
