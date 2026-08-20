import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // <-- Importante para tener acceso a la base de datos
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
