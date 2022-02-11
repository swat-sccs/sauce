import { Router } from 'express';
import passport from 'passport';
import { catchErrors } from '../util/asyncCatch';
import { logger } from '../util/logging';
import { getPosts } from '../util/markdownPosts';

// eslint-disable-next-line new-cap
export const loginRouter = Router();

loginRouter.get(
  '/',
  catchErrors(async (req: any, res) => {
    // parse markdown posts and pass them along to the pug renderer
    res.render('index', { user: req.user, posts: await getPosts() });
  }),
);

loginRouter.get('/login', (req: any, res) => {
  res.render('login', { nextUrl: req.query.next || '/' });
});

loginRouter.post(
  '/login',
  passport.authenticate('ldapauth', { failWithError: true }),
  (req, res, next) => {
    // auth success
    logger.info(`Login success for user ${req.body.username || '<error getting user>'}`);
    res.redirect(req.body.next || '/');
  },
  async (err, req, res, next) => {
    try {
      // auth failure, send the login page again
      logger.warn(`Login failure for user ${req.body.username || '<error getting user>'}`);

      res.render('login', { nextUrl: req.body.next || '/', failedAlready: true });
    } catch (error) {
      next(error);
    }
  },
);

loginRouter.get('/logout', (req: any, res) => {
  req.logout();
  res.redirect('/');
});
