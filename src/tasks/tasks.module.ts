import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module'; // <--- Importar
import { HttpModule } from '@nestjs/axios';
import { ProjectsService } from '../projects/projects.service';

@Module({
  imports: [PrismaModule, EventsModule, HttpModule],
  controllers: [TasksController],
  providers: [TasksService, ProjectsService],
})
export class TasksModule {}
