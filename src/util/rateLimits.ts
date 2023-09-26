import { RequestHandler, Response } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

import { catchErrors } from './asyncCatch';

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
  points: 20, // 20 requests
  duration: 1, // per 1 second by IP
});

const postRateLimiter = new RateLimiterMemory({
  keyPrefix: 'ratelimit_posts_per_ip',
  points: 10,
  duration: 3600,
});

export const limitRequestRate: RequestHandler = catchErrors(async (req, res, next) => {
  try {
    const limiter = req.method == 'GET' ? requestRateLimiter : postRateLimiter;
    const limiterRes = await limiter.consume(req.ip);
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

export const slowBruteIpLimiter = new RateLimiterMemory({
  keyPrefix: 'ratelimit_login_fail_ip_per_day',
  points: 100,
  duration: 60 * 60 * 24,
  blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day from the same IP
});

export const usernameIpBruteLimiter = new RateLimiterMemory({
  keyPrefix: 'ratelimit_login_fail_consecutive_username_and_ip',
  points: 10,
  duration: 2147483, // Store number for about 24 days (max value) since first fail
  blockDuration: 60 * 60, // Block for 1 hour
});
