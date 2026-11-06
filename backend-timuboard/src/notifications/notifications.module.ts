import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { NotificationPreference } from './notification-preference.entity';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/** Modul daun: tidak bergantung ke Boards/Tasks/Comments sehingga modul-modul itu bebas memanggil `notify`. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference, Board]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
