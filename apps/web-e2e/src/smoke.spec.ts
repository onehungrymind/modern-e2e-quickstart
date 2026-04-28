import { test, expect } from '@playwright/test';

test('app loads and login works', async ({ page, request }) => {
  const seeded = await request
    .post('http://localhost:3000/test/seed/user', { data: { role: 'member', emailPrefix: 'smoke' } })
    .then((r) => r.json());

  await page.goto('/login');
  await page.getByLabel('Email').fill(seeded.email);
  await page.getByLabel('Password').fill(seeded.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByTestId('app-nav')).toBeVisible();
});
