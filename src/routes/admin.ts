import { Router } from 'express';
import * as jf from 'joiful';
import { URLSearchParams } from 'url';
import * as controller from '../controllers/adminController';
import * as dtUserSearchController from '../controllers/dtUserSearchController';
import { HttpException } from '../error/httpException';
import { catchErrors } from '../util/asyncCatch';
import { isAdmin } from '../util/authUtils';
import { logger } from '../util/logging';
import { groupParamsByKey } from '../util/paramUtils';

const router = Router(); // eslint-disable-line new-cap

router.get(
  '/',
  isAdmin,
  catchErrors((req: any, res, next) => {
    res.render('admin', {
      user: req.user,
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/tasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/users`,
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
    const { error: pageErr, value: pageReq } = jf.validateAsClass(
      params,
      controller.AdminSearchReq,
    );

    if (pageErr) {
      throw new HttpException(400, { message: `Invalid value for query: ${pageErr.message}` });
    }

    const status = await controller.modifyTask(value);

    res.render('admin', {
      user: req.user,
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/tasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/users`,
      query: pageReq,
      opTask: value.id,
      opStatus: status,
    });
  }),
);

router.get(
  '/tasks',
  isAdmin,
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.query, controller.AdminSearchReq);
    if (error) {
      // this is an API endpoint so no fancy page for you
      logger.warn(`Bad tasks API request: ${error.message}`);
      return res.status(400).send(error.message);
    }

    return res.json({
      data: await controller.searchTasks(value as unknown as controller.AdminSearchReq),
    });
  }),
);

router.get(
  '/users',
  isAdmin,
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.query, dtUserSearchController.DtServerRequest);
    if (error) {
      // this is an API endpoint so no fancy page for you
      logger.warn(`Bad users API request: ${error.message}`);
      return res.status(400).json({ message: error.message });
    }

    return res.json(
      await dtUserSearchController.processUserSearch(
        value as unknown as dtUserSearchController.DtServerRequest,
      ),
    );
  }),
);

export const adminRouter = router;
