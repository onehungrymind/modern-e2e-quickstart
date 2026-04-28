import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${path.join(here, 'dev.db')}` },
  },
});

async function main() {
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash('Admin123!', 10);
  const memberHash = await bcrypt.hash('Password1!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: adminHash,
      name: 'Ada Admin',
      role: 'admin',
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash: memberHash,
      name: 'Alice Anderson',
      role: 'member',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash: memberHash,
      name: 'Bob Baker',
      role: 'member',
    },
  });

  const apollo = await prisma.project.create({
    data: {
      name: 'Apollo Launch',
      description: 'Flagship product launch — Q2 2026',
      ownerId: admin.id,
    },
  });

  const beacon = await prisma.project.create({
    data: {
      name: 'Beacon Migration',
      description: 'Migrate legacy reporting to the new warehouse',
      ownerId: alice.id,
    },
  });

  const cascade = await prisma.project.create({
    data: {
      name: 'Cascade Redesign',
      description: 'Refresh the public marketing site',
      ownerId: bob.id,
    },
  });

  const drift = await prisma.project.create({
    data: {
      name: 'Drift Analytics',
      description: null,
      ownerId: alice.id,
    },
  });

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86_400_000);

  await prisma.task.createMany({
    data: [
      {
        projectId: apollo.id,
        title: 'Finalize launch checklist',
        description: 'Coordinate with marketing, legal, support',
        status: 'doing',
        priority: 'high',
        dueDate: days(7),
        assigneeId: admin.id,
      },
      {
        projectId: apollo.id,
        title: 'Prepare press release',
        status: 'todo',
        priority: 'medium',
        dueDate: days(3),
        assigneeId: alice.id,
      },
      {
        projectId: apollo.id,
        title: 'Post-launch retrospective template',
        status: 'todo',
        priority: 'low',
        dueDate: null,
        assigneeId: null,
      },
      {
        projectId: apollo.id,
        title: 'Set up production monitoring',
        status: 'done',
        priority: 'high',
        dueDate: days(-5),
        assigneeId: bob.id,
      },
      {
        projectId: beacon.id,
        title: 'Map legacy schema to warehouse',
        status: 'doing',
        priority: 'high',
        dueDate: days(14),
        assigneeId: alice.id,
      },
      {
        projectId: beacon.id,
        title: 'Backfill last 6 months of reports',
        status: 'todo',
        priority: 'medium',
        dueDate: days(21),
        assigneeId: alice.id,
      },
      {
        projectId: beacon.id,
        title: 'Decommission old reporting box',
        status: 'todo',
        priority: 'low',
        dueDate: null,
        assigneeId: null,
      },
      {
        projectId: beacon.id,
        title: 'Pilot new dashboards with finance',
        status: 'done',
        priority: 'medium',
        dueDate: days(-2),
        assigneeId: bob.id,
      },
      {
        projectId: cascade.id,
        title: 'Audit current site for dead content',
        status: 'done',
        priority: 'medium',
        dueDate: days(-10),
        assigneeId: bob.id,
      },
      {
        projectId: cascade.id,
        title: 'Design homepage hero',
        status: 'doing',
        priority: 'high',
        dueDate: days(5),
        assigneeId: bob.id,
      },
      {
        projectId: cascade.id,
        title: 'Rewrite pricing page copy',
        status: 'todo',
        priority: 'medium',
        dueDate: days(12),
        assigneeId: alice.id,
      },
      {
        projectId: cascade.id,
        title: 'Accessibility pass on new templates',
        status: 'todo',
        priority: 'high',
        dueDate: null,
        assigneeId: null,
      },
      {
        projectId: drift.id,
        title: 'Define tracking plan for onboarding',
        status: 'doing',
        priority: 'high',
        dueDate: days(4),
        assigneeId: alice.id,
      },
      {
        projectId: drift.id,
        title: 'Hook up funnel visualization',
        status: 'todo',
        priority: 'medium',
        dueDate: days(-1),
        assigneeId: null,
      },
      {
        projectId: drift.id,
        title: 'Weekly insights email draft',
        status: 'todo',
        priority: 'low',
        dueDate: days(10),
        assigneeId: bob.id,
      },
    ],
  });

  const users = await prisma.user.count();
  const projects = await prisma.project.count();
  const tasks = await prisma.task.count();
  console.log(`Seeded: ${users} users, ${projects} projects, ${tasks} tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
