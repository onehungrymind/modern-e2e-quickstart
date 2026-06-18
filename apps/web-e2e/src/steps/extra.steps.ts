import { Given, When, Then, expect } from '../fixtures/test';

type ExtraUsers = Record<
  string,
  { id: string; name: string; email: string; token: string; role: string; password: string }
>;

function getExtraUsers(world: { extraUsers?: ExtraUsers }): ExtraUsers {
  if (!world.extraUsers) world.extraUsers = {};
  return world.extraUsers;
}

Given(
  'an E2E admin user owns a project {string}',
  async ({ scenarioWorld, seedUser, seedProject }, projectName: string) => {
    const admin = await seedUser({ role: 'admin', emailPrefix: 'extra_admin' });
    const extras = getExtraUsers(scenarioWorld as { extraUsers?: ExtraUsers });
    extras['extra_admin'] = admin;
    const project = await seedProject({ ownerId: admin.id, name: projectName });
    (scenarioWorld as { extraProjectId?: string }).extraProjectId = project.id;
  },
);

Given(
  'an E2E member user owns a project {string}',
  async ({ scenarioWorld, seedUser, seedProject }, projectName: string) => {
    const owner = await seedUser({ role: 'member', emailPrefix: 'extra_member' });
    const extras = getExtraUsers(scenarioWorld as { extraUsers?: ExtraUsers });
    extras['extra_member'] = owner;
    const project = await seedProject({ ownerId: owner.id, name: projectName });
    (scenarioWorld as { extraProjectId?: string }).extraProjectId = project.id;
  },
);

Given('an E2E admin is logged in', async ({ session, scenarioWorld, seedUser }) => {
  const user = await seedUser({ role: 'admin' });
  scenarioWorld.seededUser = user;
  await session.setStoredAuth(user);
});

Given(
  'an E2E member {string} user exists',
  async ({ scenarioWorld, seedUser }, key: string) => {
    const user = await seedUser({ role: 'member', emailPrefix: key });
    const extras = getExtraUsers(scenarioWorld as { extraUsers?: ExtraUsers });
    extras[key] = user;
  },
);

Given(
  'a project {string} seeded via the API for {string}',
  async ({ scenarioWorld, seedProject }, projectName: string, userKey: string) => {
    const extras = (scenarioWorld as { extraUsers?: ExtraUsers }).extraUsers;
    const user = extras?.[userKey];
    if (!user) throw new Error(`No extra user "${userKey}" seeded`);
    await seedProject({ ownerId: user.id, name: projectName });
  },
);

Then('my profile shows role {string}', async ({ profilePage }, role: string) => {
  await expect(profilePage.info).toContainText(role);
});

When('I search for {string}', async ({ projectsListPage }, q: string) => {
  await projectsListPage.search(q);
});

Then(
  'I do not see the project {string} in the list',
  async ({ projectsListPage, scenarioWorld }, name: string) => {
    const actual = scenarioWorld.projectNames.get(name) ?? name;
    await expect(projectsListPage.row(actual)).toHaveCount(0);
  },
);

Then('I see the projects empty state', async ({ projectsListPage }) => {
  await expect(projectsListPage.emptyState).toBeVisible();
});

When(
  'I create a project named {string} with description {string}',
  async ({ projectsListPage }, name: string, description: string) => {
    await projectsListPage.createProject(name, description);
  },
);

Then(
  'the project description reads {string}',
  async ({ projectDetailPage }, text: string) => {
    await expect(projectDetailPage.description).toContainText(text);
  },
);

When('I delete the current project', async ({ projectDetailPage }) => {
  await projectDetailPage.deleteProjectWithConfirm();
});

When('I open the admin\'s project', async ({ projectDetailPage, scenarioWorld }) => {
  const projectId = (scenarioWorld as { extraProjectId?: string }).extraProjectId;
  if (!projectId) throw new Error('No extraProjectId — did the admin-seeds-project step run?');
  await projectDetailPage.gotoById(projectId);
});

When('I open the member\'s project', async ({ projectDetailPage, scenarioWorld }) => {
  const projectId = (scenarioWorld as { extraProjectId?: string }).extraProjectId;
  if (!projectId) throw new Error('No extraProjectId');
  await projectDetailPage.gotoById(projectId);
});

Then('the delete project button is hidden', async ({ projectDetailPage }) => {
  await expect(projectDetailPage.deleteProjectButton).toHaveCount(0);
});

Then('I see a user with email {string}', async ({ usersListPage }, email: string) => {
  await expect(usersListPage.userRowByEmail(email)).toBeVisible();
});

When(
  'I open the {string} user detail page',
  async ({ userDetailPage, scenarioWorld }, userKey: string) => {
    const extras = (scenarioWorld as { extraUsers?: ExtraUsers }).extraUsers;
    const user = extras?.[userKey];
    if (!user) throw new Error(`No extra user "${userKey}"`);
    await userDetailPage.gotoById(user.id);
  },
);

Then(
  'I see the assigned task {string}',
  async ({ userDetailPage }, title: string) => {
    await expect(userDetailPage.assignedTask(title)).toBeVisible();
  },
);

Then('I see the user\'s empty tasks state', async ({ userDetailPage }) => {
  await expect(userDetailPage.tasksEmptyState).toBeVisible();
});

When('I open the new project form', async ({ projectsListPage }) => {
  await projectsListPage.openNewProjectForm();
});

When('I fill the new project name {string}', async ({ projectsListPage }, name: string) => {
  await projectsListPage.fillNewProjectName(name);
});

When('I submit the new project form', async ({ projectsListPage }) => {
  await projectsListPage.submitNewProjectForm();
});

Then('I see a new-project form error', async ({ projectsListPage }) => {
  await expect(projectsListPage.newFormErrorMatching(/fail|error/i)).toBeVisible();
});

Then('I briefly see the projects loading state', async ({ projectsListPage }) => {
  await expect(projectsListPage.loadingIndicator).toBeVisible({ timeout: 2000 });
});
