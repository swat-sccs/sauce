import { Router } from 'express';
import * as jf from 'joiful';
import * as controller from '../controllers/mailingController';
import { HttpException } from '../error/httpException';
import { listMailingLists } from '../integration/mailman';
import { catchErrors } from '../util/asyncCatch';
import { isLoggedIn } from '../util/authUtils';
import { logger } from '../util/logging';

// eslint-disable-next-line new-cap
export const mailingRouter = Router();

mailingRouter.post(
  '/',
  isLoggedIn,
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, controller.CreateMailingListReq);

    if (error) {
      logger.warn(`CreateMailingListReq validation error: ${error.message}`);
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    await controller.submitCreateMailingListRequest(value);

    res.render('createMailingListSuccess', { name: value.listName, user: req.user });
  }),
);

mailingRouter.get(
  '/exists/:list',
  catchErrors(async (req, res, next) => {
    res.send(await controller.isMailingListNameAvailable(req.params.list));
  }),
);
