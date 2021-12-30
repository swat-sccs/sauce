import { Router } from 'express';
import * as jf from 'joiful';
import timeAgo from 'node-time-ago';
import { URLSearchParams } from 'url';
import * as controller from '../controllers/adminController';
import { HttpException } from '../error/httpException';
import { catchErrors } from '../util/asyncCatch';
import { isAdmin } from '../util/authUtils';
import { logger } from '../util/logging';
import { groupParamsByKey } from '../util/paramUtils';

const router = Router(); // eslint-disable-line new-cap

router.get(
  '/',
  isAdmin,
  catchErrors(async (req: any, res, next) => {
    const { error, value } = jf.validateAsClass(req.query, controller.AdminPageReq);
    if (error) {
      logger.warn(`AdminPageReq validation error: ${error.message}`);
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    logger.debug(`Admin search query: ${JSON.stringify(req.query)}`);

    const { results, pages } = await controller.searchTasks(value);

    res.render('admin', {
      user: req.user,
      results: results,
      request: value,
      // This would probably work fine if we provided the value instead, but
      // providing the query lets us not supply params in links on the
      // page (e.g. pagination) when they didn't need to be supplied (because
      // they were default values).
      query: req.query,
      numPages: pages,
      timeAgo: timeAgo,
    });
  }),
);

router.post(
  '/',
  isAdmin,
  catchErrors(async (req: any, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, controller.AdminModifyTaskReq);

    if (error) {
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    const params = groupParamsByKey(new URLSearchParams(value.query));
    const { error: pageErr, value: pageReq } = jf.validateAsClass(params, controller.AdminPageReq);

    if (pageErr) {
      throw new HttpException(400, { message: `Invalid value for query: ${pageErr.message}` });
    }

    const status = await controller.modifyTask(value);

    logger.debug(`Re-rendering page with search query: ${JSON.stringify(pageReq)}`);

    const { results, pages } = await controller.searchTasks(
      pageReq as unknown as controller.AdminPageReq,
    );

    return res.render('admin', {
      user: req.user,
      results: results,
      request: pageReq,
      query: params,
      numPages: pages,
      timeAgo: timeAgo,
      opTask: value.id,
      opStatus: status,
    });
  }),
);

export const adminRouter = router;
