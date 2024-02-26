import { Router } from 'express';
import { existsSync, readFileSync, appendFileSync, chownSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import * as jf from 'joiful';
import path from 'path';

import { catchErrors, LocalUser, logger } from './util';

const router = Router(); // eslint-disable-line new-cap

export const sshRouter = router;

sshRouter.get(
  '/:classYear/:username',
  catchErrors((req, res, next) => {
    const { error, value } = jf.validateAsClass(req.params, LocalUser);
    if (error) {
      logger.warn(`GET forwardFile validation error: ${error.message}`);
      return res.status(400).send(error.message);
    }

    const sshDir = `/home/${value.classYear}/${value.username}/.ssh`;
    const file = `${sshDir}/authorized_keys`;

    if (existsSync(file)) {
      res.send(readFileSync(file).toString());
    } else {
      res.send('');
    }
  }),
);

sshRouter.post(
  '/:classYear/:username',
  catchErrors((req, res, next) => {
    const { error, value } = jf.validateAsClass(req.params, LocalUser);
    if (error) {
      logger.warn(`POST sshFile validation error: ${error.message}`);
      return res.status(400).send(error.message);
    }

    if (!req.is('text/plain')) {
      logger.warn(`getSSHFile body is not plaintext`);
      return res.status(400).send('Body must have type text/plain');
    }

    const userDir = `/home/${value.classYear}/${value.username}`;
    const file = `${userDir}/.ssh/authorized_keys`;

    if (existsSync(userDir)) {
      if(!existsSync(`${userDir}/.ssh`)) {
        const entry = execFileSync('/usr/bin/ldapsearch', ['-x', `\'(uid=${value.username})\'`]).toString();
        const uid = parseInt(entry.match(/uidNumber: \d\d\d\d/gi)[0]);
        const gid = parseInt(entry.match(/gidNumber: \d\d\d/gi)[0]);
        if (!(uid && gid)) {
          logger.warn(`Id of user ${value.username} (class: ${value.classYear}) could not be determined`);
          return res
            .status(400)
            .send(`Id of user ${value.username} (class: ${value.classYear}) could not be determined`);
        }
        mkdirSync(`${userDir}/.ssh`, {mode: 0o700});
        chownSync(`${userDir}/.ssh`, uid, gid);
      }
      logger.info(`Replacing contents of authorized_keys file at ${file}`);
      appendFileSync(file, req.body.toString());
      res.sendStatus(200);
    } else {
      logger.warn(`User ${value.username} (class: ${value.classYear}) does not exist`);
      return res
        .status(400)
        .send(`User ${value.username} (class: ${value.classYear}) does not exist`);
    }
  }),
);
