import type { Locator, Page } from '@playwright/test';

export class TaskForm {
  readonly page: Page;
  readonly root: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly statusSelect: Locator;
  readonly prioritySelect: Locator;
  readonly dueDateInput: Locator;
  readonly assigneeSelect: Locator;
  readonly saveButton: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('task-form');
    this.titleInput = this.root.getByLabel('Title');
    this.descriptionInput = this.root.getByLabel('Description');
    this.statusSelect = this.root.getByLabel('Status');
    this.prioritySelect = this.root.getByLabel('Priority');
    this.dueDateInput = this.root.getByLabel('Due date');
    this.assigneeSelect = this.root.getByLabel('Assignee');
    this.saveButton = this.root.getByRole('button', { name: 'Save' });
    this.createButton = this.root.getByRole('button', { name: 'Create' });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' });
    this.deleteButton = this.root.getByRole('button', { name: 'Delete' });
  }

  async waitForDetached() {
    await this.root.waitFor({ state: 'detached' });
  }

  async setStatus(status: string) {
    await this.statusSelect.selectOption(status);
  }

  async setPriority(priority: string) {
    await this.prioritySelect.selectOption(priority);
  }

  async setAssigneeByName(name: string) {
    await this.assigneeSelect.selectOption({ label: name });
  }

  async save() {
    await this.saveButton.click();
    await this.waitForDetached();
  }

  async create() {
    await this.createButton.click();
    await this.waitForDetached();
  }

  async deleteWithConfirm() {
    this.page.once('dialog', (d) => d.accept());
    await this.deleteButton.click();
  }
}
