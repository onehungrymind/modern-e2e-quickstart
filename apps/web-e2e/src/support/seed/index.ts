import { apiRequest } from '../api-client';

export type SeededUser = {
  id: string;
  email: string;
  password: string;
  token: string;
  role: string;
  name: string;
};

export type SeededProject = {
  id: string;
  name: string;
  ownerId: string;
};

export type SeededTask = {
  id: string;
};

type SeedUserInput = {
  role?: 'admin' | 'member';
  emailPrefix?: string;
};

type SeedProjectInput = {
  ownerId: string;
  name?: string;
  description?: string;
};

type SeedTaskInput = {
  projectId: string;
  title?: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assigneeId?: string;
};

export const seed = {
  user(input: SeedUserInput = {}): Promise<SeededUser> {
    return apiRequest<SeededUser>('/test/seed/user', { method: 'POST', body: input });
  },

  project(input: SeedProjectInput): Promise<SeededProject> {
    return apiRequest<SeededProject>('/test/seed/project', { method: 'POST', body: input });
  },

  task(input: SeedTaskInput): Promise<SeededTask> {
    return apiRequest<SeededTask>('/test/seed/task', { method: 'POST', body: input });
  },

  async projectWithTasks(input: {
    owner: SeededUser;
    name?: string;
    tasks?: Array<Omit<SeedTaskInput, 'projectId'>>;
  }): Promise<{ project: SeededProject; tasks: SeededTask[] }> {
    const project = await seed.project({ ownerId: input.owner.id, name: input.name });
    const tasks: SeededTask[] = [];
    for (const t of input.tasks ?? []) {
      tasks.push(await seed.task({ projectId: project.id, ...t }));
    }
    return { project, tasks };
  },

  reset(): Promise<void> {
    return apiRequest<void>('/test/reset', { method: 'POST' });
  },
};
