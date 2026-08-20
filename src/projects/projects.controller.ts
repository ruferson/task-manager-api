import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPayload } from '../auth/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt')) // 🔒 GLOBAL PROTECTION: Requires a valid JWT for all routes
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post() // Create a new project
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: UserPayload, // Automatically extracts { userId, email, role } from Token
  ) {
    return this.projectsService.create(createProjectDto, user.userId);
  }

  @Get() // List all projects for the current user
  findAll(@CurrentUser() user: UserPayload) {
    return this.projectsService.findAll(user.userId);
  }

  @Get(':id') // Get details of a specific project
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.projectsService.findOne(id, user.userId);
  }

  @Delete(':id') // Delete a project
  remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.projectsService.remove(id, user.userId);
  }
}
