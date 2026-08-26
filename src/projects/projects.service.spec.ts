import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { throwError, of } from 'rxjs';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ProjectAnalyticsResponse } from './interfaces/project-analytics-response.interface';

describe('ProjectsService - Resilience & Analytics Tests', () => {
  let service: ProjectsService;
  let httpService: HttpService;

  const mockProject = {
    id: 'proj-123',
    title: 'Proyecto Resilience Test',
    tasks: [
      { id: 'task-1', status: 'COMPLETED' },
      { id: 'task-2', status: 'IN_PROGRESS' },
      { id: 'task-3', status: 'PENDING' },
    ],
  };

  const mockPrismaService = {
    project: {
      findFirst: jest.fn().mockResolvedValue(mockProject),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockEventsGateway = {
    notifyChange: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://analytics:8000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver las analíticas procesadas cuando FastAPI está disponible', async () => {
    const mockFastApiResponse: { data: ProjectAnalyticsResponse } = {
      data: {
        project_id: 'proj-123',
        title: 'Proyecto Resilience Test',
        total_tasks: 3,
        completed_tasks: 1,
        inprogress_tasks: 1,
        pending_tasks: 1.5,
        completion_rate: 50.0,
        status: 'IN_PROGRESS',
        health: 'GOOD',
      },
    };

    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(of(mockFastApiResponse as any));

    const result = await service.getAnalytics('proj-123', 'owner-1');

    expect(result).toEqual(mockFastApiResponse.data);
    expect(jest.spyOn(httpService, 'post')).toHaveBeenCalledTimes(1);
  });

  it('debe responder con estado UNAVAILABLE cuando el servicio de FastAPI cae (Resilience Fallback)', async () => {
    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(
        throwError(
          () =>
            new Error('ECONNREFUSED: Connection refused by analytics service'),
        ),
      );

    const result = await service.getAnalytics('proj-123', 'owner-1');

    // Muestra: 1 completada + 0.5 (mitad de in_progress) = 1.5 en 3 tareas => 50%
    expect(result).toEqual({
      project_id: 'proj-123',
      title: 'Proyecto Resilience Test',
      total_tasks: 3,
      completed_tasks: 1,
      inprogress_tasks: 1,
      pending_tasks: 1.5,
      completion_rate: 50.0,
      status: 'UNAVAILABLE',
      health: 'UNKNOWN',
    });
  });
});
