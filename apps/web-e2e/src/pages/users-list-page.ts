import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class UsersListPage extends BasePage {
  readonly list: Locator;

  constructor(page: Page) {
    super(page);
    this.list = page.getByTestId('users-list');
  }

  async goto() {
    await this.page.goto('/users');
  }

  userRowByEmail(email: string): Locator {
    return this.list.getByText(email).first();
  }
}
