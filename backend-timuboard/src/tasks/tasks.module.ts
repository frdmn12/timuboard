import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskComment } from '../comments/task-comment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BoardsModule } from '../boards/boards.module';
import { MyTasksController, TasksController } from './tasks.controller';
import { TaskPin } from './task-pin.entity';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskPin, TaskComment]),
    BoardsModule,
    NotificationsModule,
  ],
  controllers: [TasksController, MyTasksController],
  providers: [TasksService],
})
export class TasksModule {}
