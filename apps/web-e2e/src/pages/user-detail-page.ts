import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class UserDetailPage extends BasePage {
  readonly name: Locator;
  readonly email: Locator;
  readonly tasksList: Locator;
  readonly tasksEmptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('user-detail-name');
    this.email = page.getByTestId('user-detail-email');
    this.tasksList = page.getByTestId('user-detail-tasks-list');
    this.tasksEmptyState = page.getByTestId('user-detail-tasks-empty-state');
  }

  async gotoById(id: string) {
    await this.page.goto(`/users/${id}`);
  }

  assignedTask(title: string): Locator {
    return this.tasksList.getByText(title);
  }
}
