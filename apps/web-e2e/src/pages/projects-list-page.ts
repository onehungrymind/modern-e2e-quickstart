import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { BasePage } from './base-page';

export class ProjectsListPage extends BasePage {
  readonly heading: Locator;
  readonly newProjectButton: Locator;
  readonly searchInput: Locator;
  readonly list: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly newForm: Locator;
  readonly newFormNameInput: Locator;
  readonly newFormDescriptionInput: Locator;
  readonly newFormSubmitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Projects' });
    this.newProjectButton = page.getByRole('button', { name: 'New project' });
    this.searchInput = page.getByLabel('Search projects');
    this.list = page.getByTestId('projects-list');
    this.emptyState = page.getByTestId('projects-list-empty-state');
    this.errorMessage = page.getByTestId('projects-list-error');
    this.loadingIndicator = page.getByTestId('projects-list-loading');
    this.newForm = page.getByTestId('project-new-form');
    this.newFormNameInput = this.newForm.getByLabel('Name');
    this.newFormDescriptionInput = this.newForm.getByLabel('Description');
    this.newFormSubmitButton = this.newForm.getByRole('button', { name: 'Create' });
  }

  async expectLanded() {
    await this.page.waitForURL('**/projects');
    await expect(this.heading).toBeVisible();
  }

  async goto() {
    await this.page.goto('/projects');
  }

  row(name: string): Locator {
    return this.list.getByTestId('projects-list-item').filter({ hasText: name });
  }

  async openProject(name: string) {
    await this.row(name).click();
  }

  async openNewProjectForm() {
    await this.newProjectButton.click();
  }

  async fillNewProjectName(name: string) {
    await this.newFormNameInput.fill(name);
  }

  async fillNewProjectDescription(description: string) {
    await this.newFormDescriptionInput.fill(description);
  }

  async submitNewProjectForm() {
    await this.newFormSubmitButton.click();
  }

  newFormErrorMatching(pattern: RegExp): Locator {
    return this.newForm.getByText(pattern);
  }

  async createProject(name: string, description?: string) {
    await test.step(`create project "${name}"`, async () => {
      await test.step('open new-project form', async () => {
        await this.openNewProjectForm();
      });
      await test.step('fill form fields', async () => {
        await this.fillNewProjectName(name);
        if (description) await this.fillNewProjectDescription(description);
      });
      await test.step('submit and wait for close', async () => {
        await this.submitNewProjectForm();
        await this.newForm.waitFor({ state: 'detached' });
      });
    });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }
}
