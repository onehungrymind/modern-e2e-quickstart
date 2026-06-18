import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { seed } from './seed';
import { E2E_WEB_BASE_URL, ROLES, storageStatePath } from './env';

export default async function globalSetup(_config: FullConfig) {
  console.log('[globalSetup] starting');
  const authDir = path.resolve(__dirname, '../../.auth');
  fs.mkdirSync(authDir, { recursive: true });

  await seed.reset();
  console.log('[globalSetup] reset complete, seeding baseline users...');

  const browser = await chromium.launch();
  try {
    for (const role of ROLES) {
      const user = await seed.user({
        role: role === 'admin' ? 'admin' : 'member',
        emailPrefix: `baseline_${role}`,
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${E2E_WEB_BASE_URL}/login`);
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(user.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('**/projects');

      const state = await context.storageState();
      const stateWithMeta = {
        ...state,
        _meta: { role, userId: user.id, email: user.email, name: user.name },
      };
      fs.writeFileSync(storageStatePath(role), JSON.stringify(stateWithMeta, null, 2));

      await context.close();
    }
  } finally {
    await browser.close();
  }
}
