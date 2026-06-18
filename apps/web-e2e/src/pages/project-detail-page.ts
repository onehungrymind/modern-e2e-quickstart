import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';

export class ProjectDetailPage extends BasePage {
  readonly name: Locator;
  readonly description: Locator;
  readonly addTaskButton: Locator;
  readonly statusFilter: Locator;
  readonly tasksList: Locator;
  readonly tasksEmptyState: Locator;
  readonly deleteProjectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('project-detail-name');
    this.description = page.getByTestId('project-detail-description');
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
    this.statusFilter = page.getByLabel('Status');
    this.tasksList = page.getByTestId('tasks-list');
    this.tasksEmptyState = page.getByTestId('project-detail-tasks-empty-state');
    this.deleteProjectButton = page.getByRole('button', { name: 'Delete project' });
  }

  async gotoById(id: string) {
    await this.page.goto(`/projects/${id}`);
  }

  taskRow(title: string): Locator {
    return this.tasksList.getByTestId('task-row').filter({ hasText: title });
  }

  taskRowStatus(title: string): Locator {
    return this.taskRow(title).getByTestId('task-row-status');
  }

  taskRowPriority(title: string): Locator {
    return this.taskRow(title).getByTestId('task-row-priority');
  }

  taskRowAssignee(title: string): Locator {
    return this.taskRow(title).getByTestId('task-row-assignee');
  }

  async filterByStatus(status: 'todo' | 'doing' | 'done' | 'all') {
    await this.statusFilter.selectOption(status === 'all' ? '' : status);
  }

  async deleteProjectWithConfirm() {
    this.page.once('dialog', (d) => d.accept());
    await this.deleteProjectButton.click();
    await this.page.waitForURL('**/projects');
  }
}
