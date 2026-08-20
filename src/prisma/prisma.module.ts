import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <- Esto hace que no tengas que importar el PrismaModule en todos lados
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <- Esto permite que otros módulos usen PrismaService
})
export class PrismaModule {}
