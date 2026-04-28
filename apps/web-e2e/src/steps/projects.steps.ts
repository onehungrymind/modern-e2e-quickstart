import { Given, When, Then, expect, resolveProjectName } from '../fixtures/test';
import { DataTable } from 'playwright-bdd';

Given(
  'a project {string} seeded via the API for the current user',
  async ({ scenarioWorld, seedProject }, name: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('Login step must run first');
    await seedProject({ ownerId: user.id, name });
  },
);

Given(
  'a project {string} seeded via the API for the current user with tasks:',
  async (
    { scenarioWorld, seedProject, seedTask },
    name: string,
    table: DataTable,
  ) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('Login step must run first');
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

Given('I visit the projects page', async ({ projectsListPage }) => {
  await projectsListPage.goto();
});

When('I create a project named {string}', async ({ projectsListPage }, name: string) => {
  await projectsListPage.createProject(name);
});

When(
  'I open the project {string}',
  async ({ projectsListPage, scenarioWorld }, name: string) => {
    const actual = resolveProjectName(scenarioWorld, name);
    await projectsListPage.goto();
    await projectsListPage.openProject(actual);
  },
);

Then(
  'I see the project {string} in the list',
  async ({ projectsListPage, scenarioWorld }, name: string) => {
    const actual = resolveProjectName(scenarioWorld, name);
    await expect(projectsListPage.row(actual)).toBeVisible();
  },
);

Then('I see tasks:', async ({ projectDetailPage, scenarioWorld }, table: DataTable) => {
  for (const row of table.hashes()) {
    const resolved =
      scenarioWorld.taskNames.get(row['title'].replace(/^E2E_/, '')) ?? row['title'];
    await expect(projectDetailPage.taskRow(resolved)).toBeVisible();
  }
});

Then('I see a projects error message', async ({ projectsListPage }) => {
  await expect(projectsListPage.errorMessage).toBeVisible();
});
