import { Handler, Router } from 'express';
import * as jf from 'joiful';
import { isLoggedIn } from '../auth';
import { ldapClient, searchAsync } from '../ldap';
import { logger } from '../logging';
import { PendingOperationModel } from '../models';
import timeAgo from 'node-time-ago';
import { functions } from '../functions/taskFunctionMap';

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
  @jf
    .number()
    .not((joi) => joi.negative())
    .default(0)
  page: number;

  @jf.number().positive().max(100).default(10)
  perPage: number;

  @jf
    .array({ elementClass: String })
    .single()
    .items((joi) => joi.valid('pending', 'executed', 'rejected', 'failed'))
    .default('pending')
  status: string[];

  // used to display status when page is re-rendered after task execution

  @jf.string().valid('executed', 'failed', 'rejected').optional()
  opStatus?: 'executed' | 'failed' | 'rejected';

  @jf.string().guid().optional()
  opTask?: string;
}
/**
 */
class AdminModifyTaskReq {
  @jf.string().guid({ version: 'uuidv4' }).required()
  id: string;

  @jf.boolean().default(false)
  reject: boolean; // if true, reject, otherwise, execute

  /**
   * Query for the originating admin page. Used to preserve e.g. search
   * parameters when redirecting.
   */
  @jf.string().default('')
  query: string;
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
      const numResults = await PendingOperationModel.count().in('status', value.status).exec();
      const numPages = Math.ceil(numResults / value.perPage);
      logger.debug(`Returning ${results.length} of ${numResults} results`);
      res.render('admin', {
        username: req.user?.uid,
        results: results,
        request: value,
        // This would probably work fine if we provided the value instead, but
        // providing the query lets us not supply params in links on the
        // page (e.g. pagination) when they didn't need to be supplied (because
        // they were default values).
        query: req.query,
        numPages: numPages,
        timeAgo: timeAgo,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/modifyTask', isAdmin, async (req: any, res, next) => {
    try {
      const { error, value } = jf.validateAsClass(req.body, AdminModifyTaskReq);

      if (error) {
        logger.warn(`AdminModifyTaskReq validation error: ${error.message}`);
        return res.status(400).send(`Invalid request: ${error.message}`);
      }

      logger.debug(`${value.reject ? 'Rejecting' : 'Accepting'} task ${value.id}`);

      const task = await PendingOperationModel.findById(value.id).exec();

      if (!task) {
        logger.warn(`Task ${value.id} not found`);
        return res.status(404).send(`Task ${value.id} not found`);
      }

      const params = new URLSearchParams(value.query);
      params.set('opTask', value.id);

      if (value.reject) {
        logger.info(`Rejecting ${task.operation} task ${value.id}`);
        task.status = 'rejected';
        task.actionTimestamp = new Date();
        await task.save();

        params.set('opStatus', 'rejected');
        return res.redirect(`/admin?${params.toString()}`);
      } else {
        logger.debug(`Executing ${task.operation} task ${value.id}`);
        try {
          functions[task.operation](task.data);
        } catch (err) {
          logger.error(`Execution of ${task.operation} task ${value.id} failed`, err);
          task.actionTimestamp = new Date();
          task.data['error'] = err.toString();
          task.markModified('data');
          task.status = 'failed';
          await task.save();
          logger.debug('Saved failure record to database');

          params.set('opStatus', 'failed');
          return res.redirect(`/admin?${params.toString()}`);
        }

        task.actionTimestamp = new Date();
        task.status = 'executed';

        await task.save();
        params.set('opStatus', 'executed');
        logger.info(`Successfully executed ${task.operation} task ${value.id}`);

        return res.redirect(`/admin?${params.toString()}`);
      }
    } catch (err) {
      next(err);
    }
  });

  app.use('/admin', router);
};
