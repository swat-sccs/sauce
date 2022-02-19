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
import { validate } from 'uuid';

const router = Router(); // eslint-disable-line new-cap

router.get(
  '/',
  isAdmin,
  catchErrors((req: any, res, next) => {
    res.render('admin', {
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getTasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getUsers`,
      messageDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getMessages`,
    });
  }),
);

router.get(
  '/tasks',
  isAdmin,
  catchErrors((req: any, res, next) => {
    res.render('admin', {
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getTasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getUsers`,
      messageDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getMessages`,
      tab: 'tasks',
    });
  }),
);

router.get(
  '/users',
  isAdmin,
  catchErrors((req: any, res, next) => {
    res.render('admin', {
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getTasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getUsers`,
      messageDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getMessages`,
      tab: 'accounts',
    });
  }),
);

router.get(
  '/messages',
  isAdmin,
  catchErrors((req: any, res, next) => {
    res.render('admin', {
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getTasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getUsers`,
      messageDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getMessages`,
      tab: 'messages',
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
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getTasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getUsers`,
      messageDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getMessages`,
      query: pageReq,
      opTask: value.id,
      opStatus: status,
      tab: 'tasksTab',
    });
  }),
);

router.get(
  '/getTasks',
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
  '/tasks/:taskId',
  isAdmin,
  catchErrors(async (req: any, res, next) => {
    res.render('admin', {
      taskDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getTasks`,
      userDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getUsers`,
      messageDataUrl: `${process.env.EXTERNAL_ADDRESS}/admin/getMessages`,
      taskData: await controller.getTask(req.params.taskId),
    });
  }),
);

router.get(
  '/getUsers',
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

router.get(
  '/getMessages',
  isAdmin,
  catchErrors(async (req: any, res, next) => {
    return res.json({ data: await controller.getStaffMessages() });
  }),
);

router.post(
  '/newMessage',
  isAdmin,
  catchErrors(async (req: any, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, controller.NewStaffMessage);

    if (error) {
      // this is an API endpoint so no fancy page for you
      logger.warn(`Bad new-message API request: ${error.message}`);
      return res.status(400).send(error.message);
    }

    await controller.addStaffMessage(value);

    return res.sendStatus(200);
  }),
);

router.post(
  '/deleteMessage/:message',
  isAdmin,
  catchErrors(async (req: any, res, next) => {
    if (!validate(req.params.message)) {
      res.sendStatus(400);
    }

    await controller.deleteStaffMessage(req.params.message);

    return res.sendStatus(200);
  }),
);

export const adminRouter = router;
