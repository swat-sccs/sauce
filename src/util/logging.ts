import { AsyncLocalStorage } from 'async_hooks';
import { RequestHandler } from 'express';
import { Logger } from 'tslog';
import { customAlphabet } from 'nanoid';

const asyncLocalStorage: AsyncLocalStorage<{ requestId: string }> = new AsyncLocalStorage();

export const logger: Logger = new Logger({
  requestId: (): string => {
    return asyncLocalStorage.getStore()?.requestId;
  },
});

export const doRequestId: RequestHandler = async (_req, res, next) => {
  const requestId: string =
    _req.headers['x-request-id']?.toString() ||
    customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 6)();

  await asyncLocalStorage.run({ requestId }, async () => {
    return next();
  });
};

export const logRequest: RequestHandler = async (req, res, next) => {
  logger.debug(`${req.ip} ${req.method} ${req.path}`);
  next();
};
