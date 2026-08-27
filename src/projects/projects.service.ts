import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import CircuitBreaker from 'opossum';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { EventsGateway } from '../events/events.gateway';
import { ProjectAnalyticsResponse } from './interfaces/project-analytics-response.interface';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Circuit Breaker configuration for external Analytics Service calls
    const breakerOptions: CircuitBreaker.Options = {
      timeout: 3000, // Trigger failure if response takes over 3 seconds
      errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
      resetTimeout: 10000, // Wait 10 seconds in Open state before testing reconnections (Half-Open)
    };

    // Encapsulate the HTTP POST request inside Opossum Circuit Breaker
    this.circuitBreaker = new CircuitBreaker(
      (analyticsUrl: string, payload: any) =>
        firstValueFrom(
          this.httpService.post<ProjectAnalyticsResponse>(
            analyticsUrl,
            payload,
          ),
        ),
      breakerOptions,
    );

    // Monitor Circuit Breaker state transitions in application logs
    this.circuitBreaker.on('open', () =>
      this.logger.warn(
        'Circuit Breaker OPEN: Analytics service unresponsive. Activating immediate fallback.',
      ),
    );
    this.circuitBreaker.on('halfOpen', () =>
      this.logger.log(
        'Circuit Breaker HALF-OPEN: Testing connection to Analytics service...',
      ),
    );
    this.circuitBreaker.on('close', () =>
      this.logger.log(
        'Circuit Breaker CLOSED: Analytics service connectivity restored.',
      ),
    );
  }

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
      // Execute network call via Circuit Breaker wrapper
      const response = (await this.circuitBreaker.fire(
        `${analyticsUrl}/analytics/project`,
        {
          project_id: project.id,
          title: project.title,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          inprogress_tasks: inprogressTasks,
        },
      )) as { data: ProjectAnalyticsResponse };

      return response.data;
    } catch (error) {
      this.logger.error(
        `Analytics service execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Graceful fallback response when Circuit is OPEN or request fails
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
