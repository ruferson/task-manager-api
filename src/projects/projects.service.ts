import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { EventsGateway } from '../events/events.gateway';
import { ProjectAnalyticsResponse } from './interfaces/project-analytics-response.interface';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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

  async getAnalytics(
    id: string,
    ownerId: string,
  ): Promise<ProjectAnalyticsResponse> {
    const project = await this.findOne(id, ownerId);

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(
      (task) => task.status === 'COMPLETED',
    ).length;

    const inprogressTasks = project.tasks.filter(
      (task) => task.status === 'IN_PROGRESS',
    ).length;

    const analyticsUrl = this.configService.get<string>(
      'ANALYTICS_SERVICE_URL',
      'http://analytics:8000',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<ProjectAnalyticsResponse>(
          `${analyticsUrl}/analytics/project`,
          {
            project_id: project.id,
            title: project.title,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            inprogress_tasks: inprogressTasks,
          },
        ),
      );

      return response.data;
    } catch {
      return {
        project_id: project.id,
        title: project.title,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        inprogress_tasks: inprogressTasks,
        pending_tasks: totalTasks - (completedTasks + inprogressTasks / 2),
        completion_rate:
          totalTasks > 0
            ? ((completedTasks + inprogressTasks / 2) / totalTasks) * 100
            : 0,
        status: 'UNAVAILABLE',
        health: 'UNKNOWN',
      };
    }
  }
}
