import { Router } from 'express';
import passport from 'passport';

import { catchErrors } from '../util/asyncCatch';
import { logger } from '../util/logging';
import { getPosts } from '../util/markdownPosts';
import { slowBruteIpLimiter, usernameIpBruteLimiter } from '../util/rateLimits';

// eslint-disable-next-line new-cap
export const loginRouter = Router();

loginRouter.get(
  '/',
  catchErrors(async (req: any, res) => {
    // parse markdown posts and pass them along to the pug renderer
    res.render('index', { posts: await getPosts() });
  }),
);

loginRouter.get('/login', (req: any, res) => {
  res.render('login', { nextUrl: req.query.next || '/' });
});

loginRouter.post(
  '/login',
  catchErrors(async (req, res, next) => {
    if (req.body.username) {
      const ip = req.ip;
      const userIpKey = `${req.body.username}_${ip}`;

      const [usernameIpLimit, slowBruteLimit] = await Promise.all([
        usernameIpBruteLimiter.get(userIpKey),
        slowBruteIpLimiter.get(ip),
      ]);

      res.locals.usernameIpLimit = usernameIpLimit;
      res.locals.slowBruteLimit = slowBruteLimit;

      // Check if IP or Username + IP is already blocked
      if (
        (slowBruteLimit && (slowBruteLimit.remainingPoints || 0) <= 0) ||
        (usernameIpLimit && (usernameIpLimit.remainingPoints || 0) <= 0)
      ) {
        // don't set the informative headers, we don't really want to expose info
        return res.render('login', {
          nextUrl: req.body.next || '/',
          failMessage: `Your IP address has been temporarily blocked due to too many failed attempts. Try again later.`,
        });
      }
    }

    return next();
  }),
  passport.authenticate('ldapauth', { failWithError: true }),
  catchErrors(async (req, res, next) => {
    // auth success
    logger.info(`Login success for user ${req.body.username || '<error getting user>'}`);
    // delete the rate limit
    if (res.locals.usernameIpLimit && res.locals.usernameIpLimit.consumedPoints > 0) {
      await usernameIpBruteLimiter.delete(`${req.body.username}_${req.ip}`);
    }
    res.redirect(req.body.next || '/');
  }),
  async (err, req, res, next) => {
    try {
      // auth failure, send the login page again
      logger.warn(`Login failure for user ${req.body.username || '<error getting user>'}`);

      try {
        await Promise.all([
          slowBruteIpLimiter.consume(req.ip),
          usernameIpBruteLimiter.consume(`${req.body.username}_${req.ip}`),
        ]);
      } catch (limitErr) {
        if (limitErr instanceof Error) {
          throw limitErr;
        } else {
          logger.warn(`Login rate limit for ${req.body.username || '<error getting user>'}`);
          return res.render('login', {
            nextUrl: req.body.next || '/',
            failMessage: `Your IP address has been temporarily blocked due to too many failed attempts. Try again later.`,
          });
        }
      }

      res.render('login', {
        nextUrl: req.body.next || '/',
        failMessage:
          "That username and password combination doesn't match any SCCS account on file.",
      });
    } catch (error) {
      next(error);
    }
  },
);

loginRouter.get('/logout', (req: any, res) => {
  req.logout();
  res.redirect('/');
});
