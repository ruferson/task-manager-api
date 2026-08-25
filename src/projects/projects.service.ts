import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createProjectDto: CreateProjectDto, ownerId: string) {
    const newProject = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        ownerId,
      },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    this.eventsGateway.notifyChange('projectCreated', newProject);

    return newProject;
  }

  async findAll(
    ownerId: string,
    page = 1,
    limit = 4,
    sortBy = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { ownerId },
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.project.count({ where: { ownerId } }),
    ]);

    return {
      data: projects,
      hasMore: skip + projects.length < total,
    };
  }

  async findOne(id: string, ownerId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async remove(id: string, ownerId: string) {
    await this.findOne(id, ownerId);

    const deletedProject = await this.prisma.project.delete({
      where: { id },
    });

    this.eventsGateway.notifyChange('projectDeleted', deletedProject);

    return deletedProject;
  }
}
