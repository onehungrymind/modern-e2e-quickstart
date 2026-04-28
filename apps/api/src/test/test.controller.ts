import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TestService } from './test.service';
import { SeedUserDto } from './dto/seed-user.dto';
import { SeedProjectDto } from './dto/seed-project.dto';
import { SeedTaskDto } from './dto/seed-task.dto';

@Controller('test')
export class TestController {
  constructor(private readonly test: TestService) {}

  @Post('seed/user')
  seedUser(@Body() dto: SeedUserDto) {
    return this.test.seedUser(dto);
  }

  @Post('seed/project')
  seedProject(@Body() dto: SeedProjectDto) {
    return this.test.seedProject(dto);
  }

  @Post('seed/task')
  seedTask(@Body() dto: SeedTaskDto) {
    return this.test.seedTask(dto);
  }

  @Post('reset')
  @HttpCode(204)
  async reset() {
    await this.test.reset();
  }
}
