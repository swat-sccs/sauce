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
    res.render('login');
  });

  app.post(
    '/login',
    passport.authenticate('ldapauth', { successRedirect: '/', failureRedirect: '/login' }),
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
