import { Given, When, Then } from '../fixtures/test';
import type { E2ERole } from '../support/env';

Given('I am not logged in', async ({ session }) => {
  await session.clear();
});

When('I open {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

Then(
  'I land on the login page with returnTo {string}',
  async ({ loginPage }, returnTo: string) => {
    await loginPage.expectReturnToParam(returnTo);
  },
);

Given('an E2E member is logged in', async ({ session, scenarioWorld, seedUser }) => {
  const user = await seedUser({ role: 'member' });
  scenarioWorld.seededUser = user;
  await session.setStoredAuth(user);
});

Given('I am logged in as {string}', async ({ session }, role: string) => {
  await session.loadStorageStateForRole(role as E2ERole);
});

Then('I see the top nav', async ({ appShell }) => {
  await appShell.expectVisible();
});

When(
  'I sign in with email {string} and password {string}',
  async ({ loginPage }, email: string, password: string) => {
    await loginPage.signIn(email, password);
  },
);

When('I visit the projects page', async ({ projectsListPage }) => {
  await projectsListPage.goto();
});

When('I log out from the top nav', async ({ appShell }) => {
  await appShell.logout();
});

Then('I land on the login page', async ({ loginPage }) => {
  await loginPage.expectOnLoginPage();
});

Then('I am on the projects page', async ({ projectsListPage }) => {
  await projectsListPage.expectLanded();
});
