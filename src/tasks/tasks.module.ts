import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module'; // <--- Importar

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
