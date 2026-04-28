import { Given, When, Then, expect, resolveTaskTitle } from '../fixtures/test';

function projectIdFromWorld(
  world: { seededProject?: { id: string; name: string }; projectNames: Map<string, string> },
  baseName: string,
): string {
  if (world.seededProject && world.projectNames.get(baseName) === world.seededProject.name) {
    return world.seededProject.id;
  }
  if (!world.seededProject) {
    throw new Error('No seeded project — run a "Given a project ..." step first');
  }
  return world.seededProject.id;
}

Given(
  'a task {string} in {string} with status {string}',
  async ({ scenarioWorld, seedTask }, title: string, projectName: string, status: string) => {
    const projectId = projectIdFromWorld(scenarioWorld, projectName);
    await seedTask({
      projectId,
      title: title.replace(/^E2E_/, ''),
      status: status as 'todo' | 'doing' | 'done',
    });
  },
);

Given(
  'a task {string} in {string} with priority {string}',
  async ({ scenarioWorld, seedTask }, title: string, projectName: string, priority: string) => {
    const projectId = projectIdFromWorld(scenarioWorld, projectName);
    await seedTask({
      projectId,
      title: title.replace(/^E2E_/, ''),
      priority: priority as 'low' | 'medium' | 'high',
    });
  },
);

Given(
  'a task {string} in {string} assigned to {string}',
  async ({ scenarioWorld, seedTask }, title: string, projectName: string, userKey: string) => {
    const projectId = projectIdFromWorld(scenarioWorld, projectName);
    const userMap = (scenarioWorld as { extraUsers?: Record<string, { id: string }> }).extraUsers;
    const user = userMap?.[userKey];
    if (!user) throw new Error(`No extra user "${userKey}" seeded`);
    await seedTask({
      projectId,
      title: title.replace(/^E2E_/, ''),
      assigneeId: user.id,
    });
  },
);

When('I add a task titled {string}', async ({ projectDetailPage }, title: string) => {
  await projectDetailPage.createTask(title);
});

When(
  'I add a task titled {string} with priority {string}',
  async ({ projectDetailPage }, title: string, priority: string) => {
    await projectDetailPage.createTask(title, {
      priority: priority as 'low' | 'medium' | 'high',
    });
  },
);

When(
  'I edit the task {string} setting status to {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, status: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await projectDetailPage.openEditTaskForm(resolved);
    await projectDetailPage.taskForm.setStatus(status);
    await projectDetailPage.taskForm.save();
  },
);

When(
  'I edit the task {string} setting priority to {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, priority: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await projectDetailPage.openEditTaskForm(resolved);
    await projectDetailPage.taskForm.setPriority(priority);
    await projectDetailPage.taskForm.save();
  },
);

When(
  'I delete the task {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await projectDetailPage.openEditTaskForm(resolved);
    await projectDetailPage.taskForm.deleteWithConfirm();
  },
);

When(
  'I filter tasks by status {string}',
  async ({ projectDetailPage }, status: string) => {
    await projectDetailPage.filterByStatus(status as 'todo' | 'doing' | 'done' | 'all');
  },
);

When(
  'I assign the task {string} to myself',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('No current user');
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await projectDetailPage.openEditTaskForm(resolved);
    await projectDetailPage.taskForm.setAssigneeByName(user.name);
    await projectDetailPage.taskForm.save();
  },
);

Then(
  'I see the task {string} in the project',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRow(resolved)).toBeVisible();
  },
);

Then(
  'I do not see the task {string} in the project',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRow(resolved)).toHaveCount(0);
  },
);

Then(
  'the task {string} shows status {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, status: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRowStatus(resolved)).toContainText(`status: ${status}`);
  },
);

Then(
  'the task {string} shows priority {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, priority: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRowPriority(resolved)).toContainText(`priority: ${priority}`);
  },
);

Then(
  'the task {string} shows assignee {string}',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string, assignee: string) => {
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRowAssignee(resolved)).toContainText(`assignee: ${assignee}`);
  },
);

Then(
  'the task {string} is assigned to me',
  async ({ projectDetailPage, scenarioWorld }, taskTitle: string) => {
    const user = scenarioWorld.seededUser;
    if (!user) throw new Error('No current user');
    const resolved = resolveTaskTitle(scenarioWorld, taskTitle);
    await expect(projectDetailPage.taskRowAssignee(resolved)).toContainText(`assignee: ${user.name}`);
  },
);
