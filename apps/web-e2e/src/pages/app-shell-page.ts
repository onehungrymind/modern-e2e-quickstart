import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AppShellPage {
  readonly page: Page;
  readonly nav: Locator;
  readonly userMenu: Locator;
  readonly profileLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.getByTestId('app-nav');
    this.userMenu = page.getByTestId('app-nav-user-menu');
    this.profileLink = page.getByTestId('app-nav-profile-link');
    this.logoutButton = this.nav.getByRole('button', { name: 'Log out' });
  }

  async expectVisible() {
    await expect(this.nav).toBeVisible();
  }

  async logout() {
    this.page.once('dialog', (d) => d.accept());
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}
