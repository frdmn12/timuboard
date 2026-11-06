import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { BoardMemberRole } from '../boards/board-member.entity';
import type { Membership } from '../boards/board-roles';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEvent } from '../realtime/realtime.events';
import { RealtimePublisher } from '../realtime/realtime-publisher';
import { Task } from '../tasks/task.entity';
import { CommentPageDto, CommentResponseDto } from './dto/comment-response.dto';
import {
  CommentQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto/comment.dto';
import { TaskComment } from './task-comment.entity';

const DEFAULT_LIMIT = 50;

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly comments: Repository<TaskComment>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimePublisher,
  ) {}

  private viewer(m: Membership) {
    return { userId: m.userId, isAdmin: m.role === BoardMemberRole.ADMIN };
  }

  /** Halaman komentar terbaru lebih dulu diambil, lalu ditampilkan lama ke baru. */
  async list(
    m: Membership,
    taskId: string,
    query: CommentQueryDto,
  ): Promise<CommentPageDto> {
    await this.assertTask(m.boardId, taskId);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const rows = await this.comments.find({
      where: {
        taskId,
        ...(query.before && { createdAt: LessThan(query.before) }),
      },
      relations: { author: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    return {
      items: page.map((c) => CommentResponseDto.from(c, this.viewer(m))),
      nextBefore: hasMore ? page[0].createdAt : null,
    };
  }

  async create(
    m: Membership,
    taskId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const task = await this.assertTask(m.boardId, taskId);
    const saved = await this.comments.save(
      this.comments.create({
        taskId,
        authorId: m.userId,
        body: dto.body,
        editedAt: null,
      }),
    );
    await this.notifyParticipants(m, task, saved);
    return this.publish(
      RealtimeEvent.COMMENT_CREATED,
      m,
      taskId,
      await this.get(m, saved.id),
    );
  }

  /** Kabari penanggung jawab dan peserta diskusi sebelumnya (pelaku otomatis dikecualikan). */
  private async notifyParticipants(
    m: Membership,
    task: Task,
    comment: TaskComment,
  ) {
    const authors = await this.comments
      .createQueryBuilder('c')
      .select('DISTINCT c.authorId', 'authorId')
      .where('c.taskId = :taskId AND c.authorId IS NOT NULL', {
        taskId: task.id,
      })
      .getRawMany<{ authorId: string }>();
    await this.notifications.notify({
      type: NotificationType.COMMENT_ADDED,
      recipientIds: [
        ...(task.assigneeId ? [task.assigneeId] : []),
        ...authors.map((a) => a.authorId),
      ],
      actorId: m.userId,
      boardId: m.boardId,
      taskId: task.id,
      data: { taskTitle: task.title, preview: comment.body.slice(0, 120) },
    });
  }

  async update(
    m: Membership,
    taskId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.find(m.boardId, taskId, commentId);
    if (comment.authorId !== m.userId) {
      throw new ForbiddenException({
        code: 'NOT_COMMENT_AUTHOR',
        message: 'Only the author can edit a comment',
      });
    }
    if (comment.body !== dto.body) {
      await this.comments.update(
        { id: commentId },
        { body: dto.body, editedAt: new Date() },
      );
    }
    return this.publish(
      RealtimeEvent.COMMENT_UPDATED,
      m,
      taskId,
      await this.get(m, commentId),
    );
  }

  async remove(
    m: Membership,
    taskId: string,
    commentId: string,
  ): Promise<void> {
    const comment = await this.find(m.boardId, taskId, commentId);
    const allowed =
      comment.authorId === m.userId || m.role === BoardMemberRole.ADMIN;
    if (!allowed) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_BOARD_ROLE',
        message: 'You do not have permission for this action',
      });
    }
    await this.comments.delete({ id: commentId });
    this.realtime.toBoard(m.boardId, RealtimeEvent.COMMENT_DELETED, m.userId, {
      taskId,
      commentId,
      commentCount: await this.comments.count({ where: { taskId } }),
    });
  }

  /** Siarkan komentar tanpa hak pribadi (`canEdit`/`canDelete`); klien menghitungnya sendiri dari penulis dan perannya. */
  private async publish(
    event: string,
    m: Membership,
    taskId: string,
    dto: CommentResponseDto,
  ): Promise<CommentResponseDto> {
    const { canEdit: _e, canDelete: _d, ...comment } = dto;
    this.realtime.toBoard(m.boardId, event, m.userId, {
      taskId,
      comment,
      commentCount: await this.comments.count({ where: { taskId } }),
    });
    return dto;
  }

  private async get(m: Membership, commentId: string) {
    const c = await this.comments.findOneOrFail({
      where: { id: commentId },
      relations: { author: true },
    });
    return CommentResponseDto.from(c, this.viewer(m));
  }

  /** Komentar harus milik tugas di papan ini; selain itu 404 tanpa membocorkan keberadaannya. */
  private async find(boardId: string, taskId: string, commentId: string) {
    await this.assertTask(boardId, taskId);
    const comment = await this.comments.findOne({
      where: { id: commentId, taskId },
    });
    if (!comment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }
    return comment;
  }

  private async assertTask(boardId: string, taskId: string) {
    const task = await this.tasks.findOne({
      where: { id: taskId, boardId },
      select: { id: true, title: true, assigneeId: true },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    return task;
  }
}
