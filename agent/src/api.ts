import { exec } from 'child_process';
import { RequestHandler, Router } from 'express';
import * as jf from 'joiful';
import { Logger } from 'tslog';

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

/**
 */
class NewUserReq {
  @jf.string().required()
  username: string;
  @jf.string().required()
  classYear: string;
}

apiRouter.post(
  '/newUser',
  catchErrors((req, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, NewUserReq);

    if (error) {
      logger.warn(`NewUserReq validation error: ${error.message}`);
      return res.status(400).send(error.message);
    }

    exec(`createNewUser.sh ${value.username} ${value.classYear}`);
  }),
);
