import { test as base, createBdd } from 'playwright-bdd';
import { randomBytes } from 'node:crypto';
import { apiRequest } from '../support/api-client';
import { LoginPage } from '../pages/login-page';
import { ProjectsListPage } from '../pages/projects-list-page';

export type ScenarioWorld = {
  scenarioId: string;
  createdUserIds: string[];
  createdProjectIds: string[];
  createdTaskIds: string[];
};

type Fixtures = {
  loginPage: LoginPage;
  projectsListPage: ProjectsListPage;
  scenarioWorld: ScenarioWorld;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  projectsListPage: async ({ page }, use) => {
    await use(new ProjectsListPage(page));
  },

  scenarioWorld: async ({}, use) => {
    const world: ScenarioWorld = {
      scenarioId: randomBytes(4).toString('hex'),
      createdUserIds: [],
      createdProjectIds: [],
      createdTaskIds: [],
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
});

export const expect = test.expect;
export const { Given, When, Then } = createBdd(test);
