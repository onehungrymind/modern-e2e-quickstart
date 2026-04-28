import { Given, When, Then, expect } from '../fixtures/test';

Given('a seeded E2E member user', async ({ seedUser }) => {
  await seedUser({ role: 'member' });
});

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

When("I sign in with the seeded user's credentials", async ({ loginPage, scenarioWorld }) => {
  const user = scenarioWorld.seededUser;
  if (!user) throw new Error('seededUser is not set — did a prior Given step run?');
  await loginPage.signIn(user.email, user.password);
});

When(
  "I sign in with the seeded user's email and password {string}",
  async ({ loginPage, scenarioWorld }, password: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('seededUser is not set');
    await loginPage.signIn(user.email, password);
  },
);

Then('I land on the projects page', async ({ projectsListPage }) => {
  await expect(projectsListPage.heading).toBeVisible();
});

Then('I see the error {string}', async ({ loginPage }, message: string) => {
  await expect(loginPage.errorMessage).toHaveText(message);
});
