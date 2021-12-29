import { Router } from 'express';
import * as controller from '../controllers/mailingController';
import { HttpException } from '../error/httpException';
import { catchErrors } from '../util/asyncCatch';
import { isLoggedIn } from '../util/authUtils';
import { logger } from '../util/logging';

const NAME_REGEX = /[a-zA-Z0-9][a-zA-Z0-9-]*/;
// eslint-disable-next-line new-cap
export const mailingRouter = Router();

mailingRouter.get(
  '/',
  isLoggedIn,
  catchErrors(async (req, res, next) => {
    res.render('mailingLists', { user: req.user, nameRegex: NAME_REGEX.source });
  }),
);

mailingRouter.post(
  '/create',
  isLoggedIn,
  catchErrors(async (req, res, next) => {
    const name = req.body['name'];

    if (!name || !NAME_REGEX.test(name)) {
      logger.warn(`Invalid list name ${name}`);
      throw new HttpException(400, { message: `Invalid list name` });
    }

    const uid = req.user['uid'];

    if (!uid) {
      throw new Error("User didn't have a uid");
    }

    const value = {
      listName: name,
      creator: uid,
    };

    const status = await controller.submitCreateMailingListRequest(value);

    res.json({ ok: status });
  }),
);

mailingRouter.get(
  '/exists/:list',
  catchErrors(async (req, res, next) => {
    res.send(await controller.isMailingListNameAvailable(req.params.list));
  }),
);
