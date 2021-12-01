import { logger } from './logging';

import passport from 'passport';
import { isLoggedIn } from './auth';

import { attachAccountRoutes } from './routes/account';
import { attachAdminRoutes } from './routes/admin';

export const attachRoutes = (app: any): void => {
  logger.info('Attaching routes');
  app.get('/', isLoggedIn, (req: any, res) => {
    res.render('index', { username: req.user?.uid });
  });

  app.get('/login', (req: any, res) => {
    res.render('login', { nextUrl: req.query.next || '/' });
  });

  app.post(
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

  app.get('/logout', (req: any, res) => {
    req.logout();
    res.redirect('/');
  });

  attachAccountRoutes(app);
  attachAdminRoutes(app);

  // 404
  app.use((req: any, res, next) => {
    res.status(404).render('404', { path: req.path });
  });
};
