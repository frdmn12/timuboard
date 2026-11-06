import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Task } from '../tasks/task.entity';
import { UsersModule } from '../users/users.module';
import { BoardAccessGuard } from './board-access.guard';
import { BoardMember } from './board-member.entity';
import { BoardMembersController } from './board-members.controller';
import { BoardMembersService } from './board-members.service';
import { Board } from './board.entity';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, BoardMember, Task]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [BoardsController, BoardMembersController],
  providers: [BoardsService, BoardMembersService, BoardAccessGuard],
  exports: [BoardsService, BoardAccessGuard, TypeOrmModule],
})
export class BoardsModule {}
