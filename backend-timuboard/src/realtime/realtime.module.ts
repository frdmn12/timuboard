import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BoardsModule } from '../boards/boards.module';
import { UsersModule } from '../users/users.module';
import { BoardsGateway } from './boards.gateway';

@Module({
  imports: [AuthModule, BoardsModule, UsersModule],
  providers: [BoardsGateway],
})
export class RealtimeModule {}
