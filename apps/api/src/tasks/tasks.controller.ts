import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:id/tasks')
  findAll(
    @Param('id') projectId: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasks.findAllForProject(projectId, status, assigneeId);
  }

  @Post('projects/:id/tasks')
  create(@Param('id') projectId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.createForProject(projectId, dto);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Patch('tasks/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.tasks.remove(id);
  }
}
