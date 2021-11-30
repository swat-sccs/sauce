import { Handler, Router } from 'express';
import { isLoggedIn } from '../auth';
import { ldapClient, searchAsync } from '../ldap';
import { logger } from '../logging';

const isAdmin: Handler = async (req: any, res, next) => {
  // that is, check if logged in and if so we'll run the inner bit
  isLoggedIn(req, res, async () => {
    if (req.user) {
      // is there a better way to do this than getting the entire list of staff members
      // and if there isn't, can we cache this or something
      const admins = (
        await searchAsync(
          ldapClient,
          `(&(cn=${process.env.LDAP_ADMIN_GROUP}))`,
          process.env.LDAP_SEARCH_BASE_GROUP,
        )
      ).memberUid;

      if (admins.includes(req.user.uid)) {
        logger.debug(`${req.user.uid} is a member of ${process.env.LDAP_ADMIN_GROUP}`);
        next();
      } else {
        logger.debug(
          `${req.user.uid} is not in ${process.env.LDAP_ADMIN_GROUP} and is unauthorized`,
        );
        // TODO nicer 403 page
        res.status(403).send('You must be an administrator to access this page!');
      }
    } else {
      logger.error("req.user didn't exist on an authenticated request");
      // TODO make a nicer error page
      res.status(500).send();
    }
  });
};

export const attachAdminRoutes = (app: any) => {
  const router = Router(); // eslint-disable-line new-cap

  router.get('/', isAdmin, async (req: any, res, next) => {
    try {
      res.render('admin', { username: req.user?.uid });
    } catch (err) {
      next(err);
    }
  });

  app.use('/admin', router);
};
