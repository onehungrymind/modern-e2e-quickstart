import { test as base, createBdd } from 'playwright-bdd';
import { randomBytes } from 'node:crypto';
import { LoginPage } from '../pages/login-page';
import { ProjectsListPage } from '../pages/projects-list-page';
import { apiClient } from '../support/api-client';

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
  apiClient: typeof apiClient;
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
      await apiClient.delete(`/tasks/${id}`).catch(() => undefined);
    }
    for (const id of world.createdProjectIds) {
      await apiClient.delete(`/projects/${id}`).catch(() => undefined);
    }
  },

  apiClient: async ({}, use) => {
    await use(apiClient);
  },
});

export const expect = test.expect;
export const { Given, When, Then } = createBdd(test);
