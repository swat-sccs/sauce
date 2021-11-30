import { Handler, Router } from 'express';
import * as jf from 'joiful';
import { isLoggedIn } from '../auth';
import { ldapClient, searchAsync } from '../ldap';
import { logger } from '../logging';
import { PendingOperationModel } from '../models';
import timeAgo from 'node-time-ago';

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

/**
 */
class AdminPageReq {
  @jf.number().positive().default(0)
  page: number;

  @jf.number().positive().max(100).default(10)
  perPage: number;

  @jf
    .array({ elementClass: String })
    .single()
    .items((joi) => joi.valid('pending', 'executed', 'rejected', 'failed'))
    .default('pending')
  status: string[];
}

export const attachAdminRoutes = (app: any) => {
  const router = Router(); // eslint-disable-line new-cap

  router.get('/', isAdmin, async (req: any, res, next) => {
    try {
      const { error, value } = jf.validateAsClass(req.query, AdminPageReq);
      if (error) {
        logger.warn(`AdminPageReq validation error: ${error.message}`);
        return res.status(400).send(`Invalid request: ${error.message}`);
      }

      logger.debug(`Admin search query: ${JSON.stringify(req.query)}`);
      const results = await PendingOperationModel.find()
        .in('status', value.status)
        .skip(value.perPage * value.page)
        .limit(value.perPage)
        .sort('-createdTimestamp')
        .exec();

      logger.debug(`Found ${results.length} results`);
      res.render('admin', {
        username: req.user?.uid,
        results: results,
        request: value,
        timeAgo: timeAgo,
      });
    } catch (err) {
      next(err);
    }
  });

  app.use('/admin', router);
};
