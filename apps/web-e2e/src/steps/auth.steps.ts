import { Given, When, Then, expect } from '../fixtures/test';

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

When(
  'I sign in with email {string} and password {string}',
  async ({ loginPage }, email: string, password: string) => {
    await loginPage.signIn(email, password);
  },
);

When('I open the login page again', async ({ loginPage }) => {
  await loginPage.goto();
});

Then('I land on the projects page', async ({ page, projectsListPage }) => {
  await expect(page).toHaveURL(/\/projects/);
  await expect(projectsListPage.heading).toBeVisible();
});

Then('I see the error {string}', async ({ loginPage }, message: string) => {
  await expect(loginPage.errorMessage).toHaveText(message);
});

Then(
  'I see the project {string} in the list',
  async ({ projectsListPage }, name: string) => {
    await expect(projectsListPage.row(name)).toBeVisible();
  },
);
