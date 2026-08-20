import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a project assigned to the authenticated user
  async create(createProjectDto: CreateProjectDto, ownerId: string) {
    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        ownerId, // Link DTO data with user ID extracted from JWT
      },
    });
  }

  // 2. Retrieve only projects belonging to the user
  async findAll(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId }, // Security filter
      include: { tasks: true }, // Include associated tasks
    });
  }

  // 3. Retrieve a specific project
  async findOne(id: string, ownerId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId }, // Project must exist AND belong to the user
      include: { tasks: true },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found or you do not have permission to view it',
      );
    }

    return project;
  }

  // 4. Delete a project
  async remove(id: string, ownerId: string) {
    // First verify it exists and belongs to the user
    await this.findOne(id, ownerId);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
