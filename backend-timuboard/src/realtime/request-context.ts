import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

const storage = new AsyncLocalStorage<{ socketId?: string }>();

/** Id socket pemanggil (header `X-Socket-Id`) agar siaran tidak memantul ke klien yang baru saja melakukan perubahan. */
export const currentSocketId = () => storage.getStore()?.socketId;

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const header = req.headers['x-socket-id'];
  const socketId =
    typeof header === 'string' && /^[\w-]{1,64}$/.test(header)
      ? header
      : undefined;
  storage.run({ socketId }, next);
}
