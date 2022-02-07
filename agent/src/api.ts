import { RequestHandler, Router } from 'express';
import * as jf from 'joiful';
import { Logger } from 'tslog';
import { execFileSync } from 'child_process';
import os from 'os';
import passport from 'passport';

export const logger: Logger = new Logger();

const router = Router(); // eslint-disable-line new-cap

export const apiRouter = router;

export const catchErrors = (action: RequestHandler): RequestHandler => {
  return async (req, res, next): Promise<any> => {
    try {
      return await action(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

export const VALID_CLASSES = ['22', '23', '24', '25', 'faculty', 'staff'];

/**
 */
class NewUserReq {
  @jf
    .string()
    .regex(/^[a-z][-a-z0-9]*$/, 'POSIX username')
    .required()
  username: string;

  // FIXME would be nice to not manually update this every year
  // TODO for that matter, can't we pull this from Cygnet?
  @jf.string().valid(VALID_CLASSES).required()
  classYear: string;
}

apiRouter.post(
  '/newUser',
  passport.authenticate('bearer', { session: false }),
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, NewUserReq);
    if (error) {
      logger.warn(`NewUserReq validation error: ${error.message}`);
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
