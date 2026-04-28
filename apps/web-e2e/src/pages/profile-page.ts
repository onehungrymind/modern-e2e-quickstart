import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class ProfilePage extends BasePage {
  readonly info: Locator;

  constructor(page: Page) {
    super(page);
    this.info = page.getByTestId('profile-info');
  }

  async goto() {
    await this.page.goto('/profile');
  }
}
