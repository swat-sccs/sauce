import * as jf from 'joiful';
import passport from 'passport';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { catchErrors, LocalUser, logger } from './util';
import { Router } from 'express';

const router = Router(); // eslint-disable-line new-cap

export const forwardingRouter = router;

forwardingRouter.get(
  '/:classYear/:username',
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

forwardingRouter.post(
  '/:classYear/:username',
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
