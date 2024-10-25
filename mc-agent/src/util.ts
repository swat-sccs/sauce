import { RequestHandler, Response } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { Logger } from 'tslog';

export const catchErrors = (action: RequestHandler): RequestHandler => {
  return async (req, res, next): Promise<any> => {
    try {
      return await action(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

export const logger = new Logger();

const setRateLimitHeaders = (limiterRes: RateLimiterRes | null, res: Response) => {
  if (limiterRes) {
    res.setHeader(
      'X-RateLimit-Limit',
      (limiterRes.remainingPoints || 0) + (limiterRes.consumedPoints || 0),
    );
    res.setHeader('X-RateLimit-Remaining', limiterRes.remainingPoints || 0);
    res.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(new Date(Date.now() + limiterRes.msBeforeNext).getTime() / 1000),
    );
  }
};

// paranoid, only allows one failed key per IP every five seconds
// this thing should only be getting requests from the SAUCE frontend server, which should have the
// key configured statically - we aren't locking out people for typos
const requestRateLimiter = new RateLimiterMemory({
  keyPrefix: 'ratelimit_auth_failures',
  points: 1, // 1 requests
  duration: 5, // per 5 seconds
});

export const denyRateLimited: RequestHandler = catchErrors(async (req, res, next) => {
  try {
    const limiterRes = await requestRateLimiter.get(req.ip);
    setRateLimitHeaders(limiterRes, res);

    if (limiterRes && (limiterRes.remainingPoints || 0) <= 0) {
      res.setHeader('Retry-After', Math.ceil(limiterRes.msBeforeNext / 1000));
      res.sendStatus(429);
    } else {
      next();
    }
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

// penalize for incorrect attempts
export const penalizeLimiter: RequestHandler = catchErrors(async (req, res, next) => {
  await requestRateLimiter.penalty(req.ip);
});
