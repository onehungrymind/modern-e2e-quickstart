import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page';
import { TaskForm } from './task-form';

export class ProjectDetailPage extends BasePage {
  readonly name: Locator;
  readonly description: Locator;
  readonly addTaskButton: Locator;
  readonly statusFilter: Locator;
  readonly tasksList: Locator;
  readonly tasksEmptyState: Locator;
  readonly deleteProjectButton: Locator;
  readonly taskForm: TaskForm;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('project-detail-name');
    this.description = page.getByTestId('project-detail-description');
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
    this.statusFilter = page.getByLabel('Status');
    this.tasksList = page.getByTestId('tasks-list');
    this.tasksEmptyState = page.getByTestId('project-detail-tasks-empty-state');
    this.deleteProjectButton = page.getByRole('button', { name: 'Delete project' });
    this.taskForm = new TaskForm(page);
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

  async openAddTaskForm() {
    await this.addTaskButton.click();
  }

  async openEditTaskForm(title: string) {
    await this.taskRow(title).getByRole('button', { name: 'Edit' }).click();
  }

  async createTask(title: string, opts: { priority?: 'low' | 'medium' | 'high' } = {}) {
    await this.openAddTaskForm();
    await this.taskForm.titleInput.fill(title);
    if (opts.priority) await this.taskForm.setPriority(opts.priority);
    await this.taskForm.create();
  }

  async deleteProjectWithConfirm() {
    this.page.once('dialog', (d) => d.accept());
    await this.deleteProjectButton.click();
    await this.page.waitForURL('**/projects');
  }
}
