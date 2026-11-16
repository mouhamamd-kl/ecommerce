import { Module } from '@nestjs/common';
import { OutboxDispatcher } from './outbox-dispatcher.js';
import { RealtimeService } from './realtime.service.js';
import { RealtimeController } from './realtime.controller.js';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, OutboxDispatcher],
})
export class AsyncEventsModule {}
