import { execFileSync } from 'child_process';
import { Router } from 'express';
import * as jf from 'joiful';
import passport from 'passport';
import { catchErrors, LocalUser, logger } from './util';

const router = Router(); // eslint-disable-line new-cap

export const userRouter = router;

userRouter.post(
  '/newUser/:classYear/:username',
  passport.authenticate('bearer', { session: false }),
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.params, LocalUser);
    if (error) {
      logger.warn(`newUser validation error: ${error.message}`);
      return res.status(400).send(error.message);
    }

    const { username, classYear } = value;

    logger.debug(`Creating user ${username} (${classYear})`);
    try {
      const stdout = execFileSync('./createNewUser.sh', [username, classYear]);
      if (stdout) {
        logger.info(`createNewUser stdout: ${stdout.toString().trimEnd()}`);
      }

      logger.info(`Created user ${username}`);

      res.sendStatus(201);
    } catch (e) {
      logger.info(`stdout: ${e.stdout.toString().trimEnd()}`);
      throw new Error(`Error creating user: ${e.stderr.toString().trimEnd()}`);
    }
  }),
);
