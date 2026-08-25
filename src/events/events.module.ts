import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway], // <--- Exportar para inyectar en otros módulos
})
export class EventsModule {}
