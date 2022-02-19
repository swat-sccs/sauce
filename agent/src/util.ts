import * as jf from 'joiful';

import { RequestHandler, Response } from 'express';
import { Logger } from 'tslog';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

export const catchErrors = (action: RequestHandler): RequestHandler => {
  return async (req, res, next): Promise<any> => {
    try {
      return await action(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;
const CLASSYEAR_REGEX = /^(\d\d|faculty|staff)$/;

/**
 */
export class LocalUser {
  @jf.string().regex(USERNAME_REGEX, 'POSIX username').required()
  username: string;

  @jf.string().regex(CLASSYEAR_REGEX, 'classYear').required()
  classYear: string;
}

export const logger: Logger = new Logger();

const setRateLimitHeaders = (limiterRes: RateLimiterRes, res: Response) => {
  res.setHeader(
    'X-RateLimit-Limit',
    (limiterRes.remainingPoints || 0) + (limiterRes.consumedPoints || 0),
  );
  res.setHeader('X-RateLimit-Remaining', limiterRes.remainingPoints || 0);
  res.setHeader(
    'X-RateLimit-Reset',
    Math.ceil(new Date(Date.now() + limiterRes.msBeforeNext).getTime() / 1000),
  );
};

// dumb rate limiter to handle requests
// I would use a MongoDB backend here but there's a weird bug where it dies on the first request
const requestRateLimiter = new RateLimiterMemory({
  keyPrefix: 'ratelimit_requests_per_id',
  points: 10, // 10 requests
  duration: 1, // per 1 second by IP
});

export const limitRequestRate: RequestHandler = catchErrors(async (req, res, next) => {
  try {
    const limiterRes = await requestRateLimiter.consume(req.ip);
    setRateLimitHeaders(limiterRes, res);
    next();
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    } else {
      setRateLimitHeaders(e, res);
      res.setHeader('Retry-After', Math.ceil(e.msBeforeNext / 1000));
      res.sendStatus(429);
    }
  }
});
