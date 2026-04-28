import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SeedUserDto } from './dto/seed-user.dto';
import { SeedProjectDto } from './dto/seed-project.dto';
import { SeedTaskDto } from './dto/seed-task.dto';

const E2E = 'E2E_';

function ensurePrefix(value: string | undefined, fallback: string): string {
  const raw = value ?? fallback;
  return raw.startsWith(E2E) ? raw : `${E2E}${raw}`;
}

function randomSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

@Injectable()
export class TestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async seedUser(dto: SeedUserDto) {
    const prefix = dto.emailPrefix ?? `user_${randomSuffix()}`;
    const email = `${E2E}${prefix}@example.com`;
    const password = 'E2EPass1!';
    const passwordHash = await bcrypt.hash(password, 10);
    const name = `E2E ${prefix}`;
    const role = dto.role ?? 'member';
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, role },
    });
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { id: user.id, email: user.email, password, token, role: user.role, name: user.name };
  }

  async seedProject(dto: SeedProjectDto) {
    const name = ensurePrefix(dto.name, `project_${randomSuffix()}`);
    const project = await this.prisma.project.create({
      data: { name, description: dto.description ?? null, ownerId: dto.ownerId },
    });
    return { id: project.id, name: project.name, ownerId: project.ownerId };
  }

  async seedTask(dto: SeedTaskDto) {
    const title = ensurePrefix(dto.title, `task_${randomSuffix()}`);
    const task = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        title,
        description: dto.description ?? null,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId ?? null,
      },
    });
    return { id: task.id };
  }

  async reset() {
    await this.prisma.task.deleteMany({
      where: {
        OR: [
          { title: { startsWith: E2E } },
          { project: { name: { startsWith: E2E } } },
          { project: { owner: { email: { startsWith: E2E } } } },
          { assignee: { email: { startsWith: E2E } } },
        ],
      },
    });
    await this.prisma.project.deleteMany({
      where: {
        OR: [
          { name: { startsWith: E2E } },
          { owner: { email: { startsWith: E2E } } },
        ],
      },
    });
    await this.prisma.user.deleteMany({ where: { email: { startsWith: E2E } } });
  }
}
