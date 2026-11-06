import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { BoardMember } from '../boards/board-member.entity';
import { TaskComment } from '../comments/task-comment.entity';
import { Board } from '../boards/board.entity';
import { BoardMemberRole } from '../boards/board-member.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEvent } from '../realtime/realtime.events';
import { RealtimePublisher } from '../realtime/realtime-publisher';
import { NotificationType } from '../notifications/notification.entity';
import {
  MoveTaskDto,
  TaskQueryDto,
  CreateTaskDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskPin } from './task-pin.entity';
import { Task, TaskStatus } from './task.entity';

const ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.DOING,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];
/** Progres minimal bawaan saat tugas masuk ke status tertentu. */
const DEFAULT_PROGRESS: Record<TaskStatus, number> = {
  todo: 0,
  doing: 25,
  review: 90,
  done: 100,
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskPin) private readonly pins: Repository<TaskPin>,
    @InjectRepository(BoardMember)
    private readonly members: Repository<BoardMember>,
    @InjectRepository(TaskComment)
    private readonly comments: Repository<TaskComment>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async list(
    boardId: string,
    userId: string,
    query: TaskQueryDto,
  ): Promise<TaskResponseDto[]> {
    const qb = this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignee', 'a')
      .where('t.boardId = :boardId', { boardId });
    if (query.status)
      qb.andWhere('t.status = :status', { status: query.status });
    if (query.assigneeId)
      qb.andWhere('t.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    if (query.q) {
      qb.andWhere(
        `(t.title ILIKE :q OR t.description ILIKE :q OR array_to_string(t.tags, ' ') ILIKE :q)`,
        { q: `%${query.q.replace(/[%_\\]/g, '\\$&')}%` },
      );
    }
    if (query.pinned)
      qb.andWhere(
        'EXISTS (SELECT 1 FROM task_pins p WHERE p.task_id = t.id AND p.user_id = :userId)',
        { userId },
      );
    const tasks = await qb
      .orderBy('t.status', 'ASC')
      .addOrderBy('t.order', 'ASC')
      .getMany();
    return this.decorate(tasks, userId);
  }

  async get(
    boardId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskResponseDto> {
    const task = await this.findInBoard(boardId, taskId);
    return (await this.decorate([task], userId))[0];
  }

  async create(
    boardId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    await this.assertAssignee(boardId, dto.assigneeId);
    const status = dto.status ?? TaskStatus.TODO;
    const last = await this.tasks
      .createQueryBuilder('t')
      .select('MAX(t.order)', 'max')
      .where('t.boardId = :boardId AND t.status = :status', { boardId, status })
      .getRawOne<{ max: number | null }>();
    const saved = await this.tasks.save(
      this.tasks.create({
        boardId,
        title: dto.title,
        description: dto.description ?? null,
        status,
        tags: dto.tags ?? [],
        priority: dto.priority ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId ?? null,
        progress: dto.progress ?? DEFAULT_PROGRESS[status],
        order: (last?.max ?? -1) + 1,
      }),
    );
    if (saved.assigneeId) {
      void this.notifications.notify({
        type: NotificationType.TASK_ASSIGNED,
        recipientIds: [saved.assigneeId],
        actorId: userId,
        boardId,
        taskId: saved.id,
        data: { taskTitle: saved.title },
      });
    }
    return this.publish(
      RealtimeEvent.TASK_CREATED,
      boardId,
      userId,
      await this.get(boardId, saved.id, userId),
    );
  }

  async update(
    boardId: string,
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const before = await this.findInBoard(boardId, taskId);
    if (dto.assigneeId) await this.assertAssignee(boardId, dto.assigneeId);
    const patch: Partial<Task> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined)
      patch.description = dto.description || null;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.dueDate !== undefined)
      patch.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.assigneeId !== undefined) patch.assigneeId = dto.assigneeId;
    if (dto.progress !== undefined) patch.progress = dto.progress;
    if (Object.keys(patch).length)
      await this.tasks.update({ id: taskId }, patch);
    if (dto.assigneeId && dto.assigneeId !== before.assigneeId) {
      void this.notifications.notify({
        type: NotificationType.TASK_ASSIGNED,
        recipientIds: [dto.assigneeId],
        actorId: userId,
        boardId,
        taskId,
        data: { taskTitle: dto.title ?? before.title },
      });
    }
    return this.publish(
      RealtimeEvent.TASK_UPDATED,
      boardId,
      userId,
      await this.get(boardId, taskId, userId),
    );
  }

  /**
   * Pindah kolom dan/atau urutan. Papan dikunci selama operasi sehingga dua drag
   * bersamaan tidak saling menimpa urutan; kolom asal dan tujuan dinomori ulang 0..n.
   */
  async move(
    boardId: string,
    taskId: string,
    userId: string,
    dto: MoveTaskDto,
  ): Promise<TaskResponseDto> {
    let movedToReview: string | null = null; // judul tugas bila baru masuk Review
    const columns: Record<string, string[]> = {}; // urutan id kolom yang terpengaruh, untuk siaran
    await this.dataSource.transaction(async (m) => {
      await m.findOne(Board, {
        where: { id: boardId },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      const task = await m.findOne(Task, { where: { id: taskId, boardId } });
      if (!task) throw this.notFound();

      const from = task.status;
      if (dto.status === TaskStatus.REVIEW && from !== TaskStatus.REVIEW)
        movedToReview = task.title;
      const target = (
        await m.find(Task, {
          where: { boardId, status: dto.status },
          order: { order: 'ASC' },
        })
      ).filter((t) => t.id !== taskId);
      target.splice(Math.min(dto.position, target.length), 0, task);

      if (from !== dto.status) {
        const forward = ORDER.indexOf(dto.status) > ORDER.indexOf(from);
        task.status = dto.status;
        if (forward)
          task.progress = Math.max(task.progress, DEFAULT_PROGRESS[dto.status]);
        else if (task.progress === 100)
          task.progress = DEFAULT_PROGRESS[dto.status];
        // Kolom asal tanpa tugas yang dipindah; tanpa filter ini nomor urut bolong.
        const source = (
          await m.find(Task, {
            where: { boardId, status: from },
            order: { order: 'ASC' },
          })
        ).filter((t) => t.id !== taskId);
        await this.renumber(m.getRepository(Task), source);
        columns[from] = source.map((t) => t.id);
      }
      await this.renumber(m.getRepository(Task), target, task);
      columns[dto.status] = target.map((t) => t.id);
    });
    if (movedToReview !== null)
      await this.notifyReview(boardId, taskId, userId, movedToReview);
    return this.publish(
      RealtimeEvent.TASK_MOVED,
      boardId,
      userId,
      await this.get(boardId, taskId, userId),
      { columns },
    );
  }

  /** Siarkan versi "bersama" tugas (tanpa `pinned`, yang bersifat pribadi) ke anggota lain yang membuka papan. */
  private publish(
    event: string,
    boardId: string,
    actorId: string,
    dto: TaskResponseDto,
    extra: Record<string, unknown> = {},
  ): TaskResponseDto {
    const { pinned: _personal, ...task } = dto;
    this.realtime.toBoard(boardId, event, actorId, { task, ...extra });
    return dto;
  }

  /** Tugas masuk Review: beri tahu admin papan (selain yang memindahkan). */
  private async notifyReview(
    boardId: string,
    taskId: string,
    actorId: string,
    taskTitle: string,
  ) {
    const admins = await this.members.find({
      where: { boardId, role: BoardMemberRole.ADMIN },
      select: { userId: true },
    });
    await this.notifications.notify({
      type: NotificationType.REVIEW_REQUESTED,
      recipientIds: admins.map((a) => a.userId),
      actorId,
      boardId,
      taskId,
      data: { taskTitle },
    });
  }

  async remove(boardId: string, taskId: string, userId: string): Promise<void> {
    const res = await this.tasks.delete({ id: taskId, boardId });
    if (!res.affected) throw this.notFound();
    this.realtime.toBoard(boardId, RealtimeEvent.TASK_DELETED, userId, {
      taskId,
    });
  }

  async pin(
    boardId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskResponseDto> {
    await this.findInBoard(boardId, taskId);
    await this.pins
      .createQueryBuilder()
      .insert()
      .values({ taskId, userId })
      .orIgnore()
      .execute();
    return this.get(boardId, taskId, userId);
  }

  async unpin(boardId: string, taskId: string, userId: string): Promise<void> {
    await this.findInBoard(boardId, taskId);
    await this.pins.delete({ taskId, userId });
  }

  /** Semua tugas yang disematkan pengguna, dari papan yang masih ia ikuti. */
  async listPinned(userId: string): Promise<TaskResponseDto[]> {
    const tasks = await this.tasks
      .createQueryBuilder('t')
      .innerJoin(TaskPin, 'p', 'p.taskId = t.id AND p.userId = :userId', {
        userId,
      })
      .innerJoin(
        BoardMember,
        'm',
        'm.boardId = t.boardId AND m.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect('t.assignee', 'a')
      .orderBy('p.createdAt', 'DESC')
      .getMany();
    const counts = await this.commentCounts(tasks.map((t) => t.id));
    return tasks.map((t) =>
      TaskResponseDto.from(t, true, counts.get(t.id) ?? 0),
    );
  }

  private async findInBoard(boardId: string, taskId: string) {
    const task = await this.tasks.findOne({
      where: { id: taskId, boardId },
      relations: { assignee: true },
    });
    if (!task) throw this.notFound();
    return task;
  }

  private async decorate(
    tasks: Task[],
    userId: string,
  ): Promise<TaskResponseDto[]> {
    const pinned = tasks.length
      ? new Set(
          (
            await this.pins.find({
              where: { userId, taskId: In(tasks.map((t) => t.id)) },
              select: { taskId: true },
            })
          ).map((p) => p.taskId),
        )
      : new Set<string>();
    const counts = await this.commentCounts(tasks.map((t) => t.id));
    return tasks.map((t) =>
      TaskResponseDto.from(t, pinned.has(t.id), counts.get(t.id) ?? 0),
    );
  }

  /** Jumlah komentar per tugas dalam satu query (tanpa N+1). */
  private async commentCounts(taskIds: string[]) {
    const out = new Map<string, number>();
    if (!taskIds.length) return out;
    const rows = await this.comments
      .createQueryBuilder('c')
      .select('c.taskId', 'taskId')
      .addSelect('COUNT(*)', 'count')
      .where('c.taskId IN (:...taskIds)', { taskIds })
      .groupBy('c.taskId')
      .getRawMany<{ taskId: string; count: string }>();
    for (const r of rows) out.set(r.taskId, Number(r.count));
    return out;
  }

  private async assertAssignee(boardId: string, assigneeId?: string | null) {
    if (
      assigneeId &&
      !(await this.members.exists({ where: { boardId, userId: assigneeId } }))
    ) {
      throw new BadRequestException({
        code: 'ASSIGNEE_NOT_MEMBER',
        message: 'Assignee must be a member of this board',
      });
    }
  }

  private async renumber(repo: Repository<Task>, column: Task[], force?: Task) {
    for (let i = 0; i < column.length; i++) {
      const t = column[i];
      if (t.order !== i || t === force) {
        t.order = i;
        await repo.save(t);
      }
    }
  }

  private notFound() {
    return new NotFoundException({
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    });
  }
}
