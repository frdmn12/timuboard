import { Global, Module } from '@nestjs/common';
import { RealtimePublisher } from './realtime-publisher';

/** Global dan tanpa dependensi ke modul fitur, agar Tasks/Comments/Boards/Notifications bebas memakainya. */
@Global()
@Module({ providers: [RealtimePublisher], exports: [RealtimePublisher] })
export class RealtimePublisherModule {}
