import * as jf from 'joiful';

import { RequestHandler } from 'express';
import { Logger } from 'tslog';

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
export class LocalUser {
  @jf.string().regex(USERNAME_REGEX, 'POSIX username').required()
  username: string;

  @jf.string().regex(CLASSYEAR_REGEX, 'classYear').required()
  classYear: string;
}

export const logger: Logger = new Logger();
