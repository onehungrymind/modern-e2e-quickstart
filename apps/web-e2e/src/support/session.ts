import * as fs from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';
import { storageStatePath, type E2ERole } from './env';
import type { SeededUser } from './seed';

const STORAGE_KEY = 'e2e-quickstart-auth';

export class SessionHelper {
  readonly page: Page;
  readonly context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  async clear() {
    await this.context.clearCookies();
  }

  async setStoredAuth(user: SeededUser) {
    await this.context.clearCookies();
    await this.page.goto('/login');
    await this.page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [
        STORAGE_KEY,
        JSON.stringify({
          token: user.token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        }),
      ] as [string, string],
    );
  }

  async loadStorageStateForRole(role: E2ERole) {
    const state = JSON.parse(fs.readFileSync(storageStatePath(role), 'utf-8'));
    await this.context.clearCookies();
    await this.page.goto('/login');
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        await this.page.evaluate(
          ([k, v]: [string, string]) => window.localStorage.setItem(k, v),
          [item.name, item.value] as [string, string],
        );
      }
    }
  }
}
