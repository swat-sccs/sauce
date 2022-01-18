import { Router } from 'express';
import * as jf from 'joiful';
import * as controller from '../controllers/minecraftController';
import { HttpException } from '../error/httpException';
import { catchErrors } from '../util/asyncCatch';
import { isLoggedIn } from '../util/authUtils';

export const router = Router(); // eslint-disable-line new-cap

router.get(
  '/',
  isLoggedIn,
  catchErrors(async (req: any, res, next) => {
    res.render('minecraft', {
      user: req.user,
      mcInfo: await controller.getMcForLdapUser(req.user.uid),
    });
  }),
);

router.post(
  '/',
  isLoggedIn,
  catchErrors(async (req: any, res, next) => {
    if (!req.body.mcUser) {
      throw new HttpException(400, { message: 'Missing required parameter: mcUser' });
    }

    try {
      await controller.associateMcWithLdap(req.user.uid, req.body.mcUser);
    } catch (e) {
      if (e instanceof HttpException) {
        return res.render('minecraft', {
          user: req.user,
          mcInfo: await controller.getMcForLdapUser(req.user.uid),
          err: e.friendlyMessage,
        });
      } else {
        throw e;
      }
    }

    res.redirect('/minecraft/');
  }),
);

router.post(
  '/remove',
  isLoggedIn,
  catchErrors(async (req: any, res, next) => {
    await controller.removeMcAccount(req.user.uid);

    res.redirect('/minecraft/');
  }),
);

export const minecraftRouter = router;
