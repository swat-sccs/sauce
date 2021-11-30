import e, { Router } from 'express';
import { logger } from '../logging';
import { ldapClient, searchAsyncUid } from '../ldap';
import * as jf from 'joiful';
import { PendingOperationModel } from '../models';
import { v4 as uuidv4 } from 'uuid';

const VALID_CLASSES = ['22', '23', '24', '25', 'faculty', 'staff'];

/**
 */
class CreateAccountReq {
  // usernames must comply with debian/ubuntu standards so we can give them
  // Heron accounts
  @jf
    .string()
    .regex(/^[a-z][-a-z0-9]*$/, 'POSIX username')
    .required()
  username: string;

  @jf
    .string()
    .email()
    .regex(/.+@swarthmore\.edu/, 'Swarthmore email address')
    .required()
  email: string;

  @jf.string().required()
  name: string;

  // FIXME would be nice to not manually update this every year
  // TODO for that matter, can't we pull this from Cygnet?
  @jf.string().valid(VALID_CLASSES).required()
  classYear: string;
}

export const attachAccountRoutes = (app: any) => {
  const router = Router(); // eslint-disable-line new-cap

  router.get('/create', (req, res, next) => {
    // TODO how do we handle someone going to create an account if they're
    //  already logged in?
    try {
      res.render('createAccount', { classes: VALID_CLASSES });
    } catch (err) {
      next(err);
    }
  });

  router.post('/create', async (req: any, res, next) => {
    try {
      const { error, value } = jf.validateAsClass(req.body, CreateAccountReq);

      if (error) {
        logger.warn(`CreateAccountReq validation error: ${error.message}`);
        return res.status(400).send(`Invalid request: ${error.message}`);
      }

      // TODO also search and see if that user ID is in the creation queue
      if (await searchAsyncUid(ldapClient, req.params.username)) {
        return res.status(400).send(`Username ${req.params.username} already exists`);
      }
      // TODO check that an account doesn't already exist with the given email

      logger.info(`Submitting CreateAccountReq ${JSON.stringify(value)}`);
      const operation = new PendingOperationModel({
        _id: uuidv4(),
        operation: 'createAccount',
        createdTimestamp: Date.now(),
        data: value,
      });
      await operation.save();
      res.render('createAccountSuccess', { email: value.email });
    } catch (err) {
      next(err);
    }
  });

  router.get('/username-ok/:username', async (req: any, res, next) => {
    try {
      // TODO also search and see if that user ID is in the creation queue
      if (await searchAsyncUid(ldapClient, req.params.username)) {
        logger.debug(`${req.params.username} already exists`);
        res.send(false);
      } else {
        res.send(true);
        logger.debug(`${req.params.username} does not already exist`);
      }
    } catch (err) {
      next(err);
    }
  });

  app.use('/account', router);
};
