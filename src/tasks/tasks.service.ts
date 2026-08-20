import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    // 1. Validate that the project exists and belongs to the user
    const project = await this.prisma.project.findFirst({
      where: { id: createTaskDto.projectId, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException(
        'The specified project does not exist or does not belong to you',
      );
    }

    // 2. Create the task
    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        assignedToId: userId,
      },
    });
  }

  async findAllByProject(projectId: string, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.task.findMany({
      where: { projectId },
    });
  }

  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: { ownerId: userId }, // Relational lookup: validates project ownership
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    // Validate that the task exists and the project belongs to the user
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: { ownerId: userId },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });
  }
}
