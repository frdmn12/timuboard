import { Module } from '@nestjs/common';
import { PlaygroundGateway } from './playground.gateway';

@Module({ providers: [PlaygroundGateway] })
export class PlaygroundModule {}
