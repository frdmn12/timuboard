import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsModule } from '../boards/boards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Task } from '../tasks/task.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { TaskComment } from './task-comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskComment, Task]),
    BoardsModule,
    NotificationsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
