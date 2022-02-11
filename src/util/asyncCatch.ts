import { RequestHandler } from 'express';

export const catchErrors = (action: RequestHandler): RequestHandler => {
  return async (req, res, next): Promise<any> => {
    try {
      return await action(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};
