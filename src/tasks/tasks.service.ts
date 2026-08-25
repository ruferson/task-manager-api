import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway, // <--- Inyección del Gateway
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: createTaskDto.projectId, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException(
        'The specified project does not exist or does not belong to you',
      );
    }

    // Añadido 'await' obligatorio
    const newTask = await this.prisma.task.create({
      data: {
        ...createTaskDto,
        assignedToId: userId,
      },
    });

    // Notificar creación en tiempo real
    this.eventsGateway.notifyChange('taskCreated', newTask);

    return newTask;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: { ownerId: userId },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });

    // Notificar actualización de estado/título en tiempo real
    this.eventsGateway.notifyChange('taskUpdated', updatedTask);

    return updatedTask;
  }

  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: { ownerId: userId },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const deletedTask = await this.prisma.task.delete({
      where: { id },
    });

    // Notificar eliminación en tiempo real
    this.eventsGateway.notifyChange('taskDeleted', deletedTask);

    return deletedTask;
  }

  async findAllByProject(projectId: string, userId: string) {
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
}
