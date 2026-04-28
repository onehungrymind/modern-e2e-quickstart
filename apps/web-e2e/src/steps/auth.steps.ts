import { test as base, createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(base);

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login');
});

When(
  'I sign in with email {string} and password {string}',
  async ({ page }, email: string, password: string) => {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  },
);

When('I open the login page again', async ({ page }) => {
  await page.goto('/login');
});

Then('I land on the projects page', async ({ page }) => {
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});

Then('I see the error {string}', async ({ page }, message: string) => {
  await expect(page.getByTestId('login-error-message')).toHaveText(message);
});
