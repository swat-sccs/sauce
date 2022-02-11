import { RequestHandler, Router } from 'express';
import * as jf from 'joiful';
import { Logger } from 'tslog';
import { execFileSync } from 'child_process';
import passport from 'passport';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

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

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;
const CLASSYEAR_REGEX = /^(\d\d|faculty|staff)$/;

/**
 */
class LocalUser {
  @jf.string().regex(USERNAME_REGEX, 'POSIX username').required()
  username: string;

  @jf.string().regex(CLASSYEAR_REGEX, 'classYear').required()
  classYear: string;
}

apiRouter.post(
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

apiRouter.get(
  '/forwardFile/:classYear/:username',
  passport.authenticate('bearer', { session: false }),
  catchErrors((req, res, next) => {
    const { error, value } = jf.validateAsClass(req.params, LocalUser);
    if (error) {
      logger.warn(`GET forwardFile validation error: ${error.message}`);
      return res.status(400).send(error.message);
    }

    const file = `/home/${value.classYear}/${value.username}/.forward`;

    if (existsSync(file)) {
      res.send(readFileSync(file).toString());
    } else {
      res.send('');
    }
  }),
);

apiRouter.post(
  '/forwardFile/:classYear/:username',
  passport.authenticate('bearer', { session: false }),
  catchErrors((req, res, next) => {
    const { error, value } = jf.validateAsClass(req.params, LocalUser);
    if (error) {
      logger.warn(`POST forwardFile validation error: ${error.message}`);
      return res.status(400).send(error.message);
    }

    if (!req.is('text/plain')) {
      logger.warn(`getForwardFile body is not plaintext`);
      return res.status(400).send('Body must have type text/plain');
    }

    const file = `/home/${value.classYear}/${value.username}/.forward`;

    if (existsSync(path.dirname(file))) {
      logger.info(`Replacing contents of forward file at ${file}`);
      writeFileSync(file, req.body.toString());
      res.sendStatus(200);
    } else {
      logger.warn(`User ${value.username} (class: ${value.classYear}) does not exist`);
      return res
        .status(400)
        .send(`User ${value.username} (class: ${value.classYear}) does not exist`);
    }
  }),
);
