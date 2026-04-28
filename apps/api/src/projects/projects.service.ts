import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, ownerId?: string) {
    return this.prisma.project.findMany({
      where: {
        ...(search ? { name: { contains: search } } : {}),
        ...(ownerId ? { ownerId } : {}),
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(dto: CreateProjectDto, user: User) {
    return this.prisma.project.create({
      data: { name: dto.name, description: dto.description, ownerId: user.id },
    });
  }

  async update(id: string, dto: UpdateProjectDto, user: User) {
    const project = await this.findOne(id);
    if (user.role !== 'admin' && project.ownerId !== user.id) {
      throw new ForbiddenException();
    }
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: User) {
    const project = await this.findOne(id);
    if (user.role !== 'admin' && project.ownerId !== user.id) {
      throw new ForbiddenException();
    }
    return this.prisma.project.delete({ where: { id } });
  }
}
