import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class ProjectsListPage extends BasePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newProjectButton: Locator;
  readonly list: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Projects' });
    this.searchInput = page.getByLabel('Search projects');
    this.newProjectButton = page.getByRole('button', { name: 'New project' });
    this.list = page.getByTestId('projects-list');
    this.emptyState = page.getByTestId('projects-list-empty-state');
  }

  async goto() {
    await this.page.goto('/projects');
  }

  row(name: string): Locator {
    return this.list.getByTestId('projects-list-item').filter({ hasText: name });
  }
}
