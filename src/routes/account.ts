import { Router } from 'express';
import * as jf from 'joiful';
import * as controller from '../controllers/accountController';
import { HttpException } from '../error/httpException';
import { catchErrors } from '../util/asyncCatch';
import { isLoggedIn } from '../util/authUtils';
import { logger } from '../util/logging';

export const router = Router(); // eslint-disable-line new-cap

router.get(
  '/create',
  catchErrors((req, res, next) => {
    res.render('createAccount', { classes: controller.VALID_CLASSES });
  }),
);

router.post(
  '/create',
  catchErrors(async (req: any, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, controller.CreateAccountReq);

    if (error) {
      logger.warn(`CreateAccountReq validation error: ${error.message}`);
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    await controller.submitCreateAccountRequest(value);

    res.render('createAccountSuccess', { email: value.email });
  }),
);

router.get(
  '/username-ok/:username',
  catchErrors(async (req: any, res, next) => {
    res.send(await controller.isUsernameAvailable(req.params.username));
  }),
);

router.get(
  '/email-ok/:email',
  catchErrors(async (req: any, res, next) => {
    res.send(await controller.isEmailAvailable(req.params.email));
  }),
);

router.get(
  '/forgot',
  catchErrors((req, res, next) => {
    res.render('forgot', {
      done: false,
      inputRegex: controller.USERNAME_OR_EMAIL_REGEX.source,
    });
  }),
);

router.post(
  '/forgot',
  catchErrors((req: any, res, next) => {
    const identifier = req.body.id;
    if (!identifier) {
      throw new HttpException(400, { message: 'Missing request parameter: id' });
    }

    if (!controller.USERNAME_OR_EMAIL_REGEX.test(identifier)) {
      throw new HttpException(400, {
        message: `ID "${identifier}" isn't a valid username or email`,
      });
    }

    // this runs asynchronously after we reply, so we get super-quick page returns and also prevent
    // enumeration attacks.
    controller.doPasswordResetRequest(identifier);

    res.render('forgot', { done: true });
  }),
);

router.get(
  '/reset',
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.query, controller.PasswordResetCredentials);

    if (error) {
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    // I have no idea why joiful throws a fit here but this is the necessary workaround
    const resetRequest = await controller.verifyPasswordReset(
      value as unknown as controller.PasswordResetCredentials,
    );

    return res.render('resetPassword', {
      id: value.id,
      key: value.key,
      username: resetRequest.user,
    });
  }),
);

/**
 *
 */

router.post(
  '/reset',
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, controller.PasswordResetRequestParams);
    if (error) {
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    await controller.doPasswordReset(value);

    return res.render('resetPasswordSuccess');
  }),
);

router.get(
  '/',
  isLoggedIn,
  catchErrors((req, res, next) => {
    return res.render('account', { user: req.user });
  }),
);

export const accountRouter = router;
