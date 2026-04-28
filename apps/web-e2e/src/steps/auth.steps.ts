import { test as base, createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { ProjectsListPage } from '../pages/projects-list-page';

const { Given, When, Then } = createBdd(base);

Given('I am on the login page', async ({ page }) => {
  await new LoginPage(page).goto();
});

When(
  'I sign in with email {string} and password {string}',
  async ({ page }, email: string, password: string) => {
    await new LoginPage(page).signIn(email, password);
  },
);

When('I open the login page again', async ({ page }) => {
  await new LoginPage(page).goto();
});

Then('I land on the projects page', async ({ page }) => {
  const projects = new ProjectsListPage(page);
  await expect(page).toHaveURL(/\/projects/);
  await expect(projects.heading).toBeVisible();
});

Then('I see the error {string}', async ({ page }, message: string) => {
  await expect(new LoginPage(page).errorMessage).toHaveText(message);
});

Then('I see the project {string} in the list', async ({ page }, name: string) => {
  await expect(new ProjectsListPage(page).row(name)).toBeVisible();
});
