import bcrypt from 'bcrypt';

import { Router } from 'express';
import * as jf from 'joiful';
import { Change } from 'ldapjs';
import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { mailTransporter } from '../integration/email';
import { ldapClient } from '../integration/ldap';
import { PasswordResetRequestModel, PendingOperationModel } from '../integration/models';
import { generateEmail } from '../util/emailTemplates';
import { modifyLdap, searchAsync, searchAsyncUid } from '../util/ldapUtils';
import { logger } from '../util/logging';
import { testPassword } from '../util/passwordStrength';

const VALID_CLASSES = ['22', '23', '24', '25', 'faculty', 'staff'];
// TODO: do we have accounts in the system that don't match this username pattern?
const USERNAME_OR_EMAIL_REGEX =
  /^[a-z][-a-z0-9]*$|^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:.[a-zA-Z0-9-]+)*$/;

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;

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

export const router = Router(); // eslint-disable-line new-cap

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
    const [inDatabase, inPending] = await Promise.all([
      searchAsyncUid(ldapClient, req.params.username),
      PendingOperationModel.exists({ 'data.username': req.params.username, status: 'pending' }),
    ]);

    // TODO also search and see if that user ID is in the creation queue
    if (inDatabase || inPending) {
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

router.get('/email-ok/:email', async (req: any, res, next) => {
  try {
    // TODO also search and see if that user ID is in the creation queue
    const [inDatabase, inPending] = await Promise.all([
      searchAsync(ldapClient, `(swatmail=${req.params.email})`),
      PendingOperationModel.exists({ 'data.email': req.params.email, status: 'pending' }),
    ]);

    if (inDatabase || inPending) {
      logger.debug(`${req.params.email} already exists`);
      res.send(false);
    } else {
      res.send(true);
      logger.debug(`${req.params.email} does not already exist`);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/forgot', (req, res, next) => {
  res.render('forgot', { done: false, inputRegex: USERNAME_OR_EMAIL_REGEX.source });
});

const processPasswordReset = async (identifier: string) => {
  try {
    let account: any = null;
    if (USERNAME_REGEX.test(identifier)) {
      // it's a username
      logger.debug(`Searching for uid ${identifier}`);
      account = await searchAsyncUid(ldapClient, identifier);
    } else {
      // it's an email; do we have an account for it?
      logger.debug(`Searching for account with email ${identifier}`);
      account = await searchAsync(ldapClient, `(|(email=${identifier})(swatmail=${identifier}))`);
    }

    if (account) {
      const uid = account.uid;
      const email = account.email || account.swatmail;
      logger.debug(`Creating password reset/reminder for ${uid}`);

      const resetId = nanoid();
      const resetKey = nanoid();

      await new PasswordResetRequestModel({
        _id: resetId,
        key: await bcrypt.hash(resetKey, 10),
        user: uid,
        timestamp: new Date(),
      }).save();

      const [emailText, transporter] = await Promise.all([
        generateEmail('resetPassword.html', {
          username: uid,
          domain: process.env.EXTERNAL_ADDRESS,
          resetKey: resetKey,
          resetId: resetId,
        }),
        mailTransporter,
      ]);

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your SCCS Account',
        html: emailText,
      });

      const msgUrl = nodemailer.getTestMessageUrl(info);
      if (msgUrl) {
        logger.debug(`View message at ${msgUrl}`);
      }
    } else {
      logger.debug(`No account found for ${identifier}`);
    }
  } catch (err) {
    logger.error('Error processing passsword reset', err);
  }
};

router.post('/forgot', (req: any, res, next) => {
  try {
    const identifier = req.body.id;
    if (!identifier) {
      logger.warn('ForgotRequest had missing ID');
      return res.status(400).send('Missing request parameter: id');
    }

    if (!USERNAME_OR_EMAIL_REGEX.test(identifier)) {
      logger.warn(`ForgotRequest: id ${identifier} isn't a valid username or email`);
      return res.status(400).send('ID must be a valid username or email');
    }

    // this runs asynchronously after we reply, so we get super-quick page returns and also prevent
    // enumeration attacks.
    processPasswordReset(identifier);

    res.render('forgot', { done: true });
  } catch (err) {
    next(err);
  }
});

router.get('/reset', async (req, res, next) => {
  try {
    const id = req.query.id;
    const key = req.query.key;

    const invalidProps = {
      msg: 'This password reset link is invalid or expired. <a href="/account/forgot">Request a new one</a>.',
    };

    if (!id || !key || !(typeof key === 'string' || key instanceof String)) {
      logger.warn('Password reset request missing query params');
      return res.render('400', invalidProps);
    }

    const resetRequest = await PasswordResetRequestModel.findById(id);
    if (!resetRequest) {
      logger.warn(`Password reset ID ${id} did not match any request`);
      return res.render('400', invalidProps);
    }

    if (await bcrypt.compare(key as string, resetRequest.key)) {
      return res.render('resetPassword', { id: id, key: key, username: resetRequest.user });
    } else {
      logger.warn(`Password reset key did not match database`);
      return res.render('400', invalidProps);
    }
  } catch (err) {
    next(err);
  }
});

/**
 *
 */
class ResetPasswordReq {
  @jf.string().required()
  id: string;
  @jf.string().required()
  key: string;

  // we'll properly validate it later
  @jf.string().required()
  password: string;
}

router.post('/reset', async (req, res, next) => {
  try {
    const { error, value } = jf.validateAsClass(req.body, ResetPasswordReq);
    if (error) {
      logger.warn(`ResetPassword validation error: ${error.message}`);
      return res.status(400).send(`Invalid request: ${error.message}`);
    }

    const invalidProps = {
      msg: 'The password reset request you used is invalid or expired. Your password has not been changed, but you\'ll need to <a href="/account/forgot">request a new password reset link</a>.',
    };

    const resetRequest = await PasswordResetRequestModel.findById(value.id);
    if (!resetRequest) {
      logger.warn(`Password reset ID ${value.id} did not match any request`);
      return res.render('400', invalidProps);
    }

    if (await bcrypt.compare(value.key as string, resetRequest.key)) {
      // now we check the password
      const testResult = await testPassword(value.password);
      if (testResult.score < 2) {
        // this really shouldn't happen if they submitted something via the web form
        logger.warn(`Provided password was too weak`);
        return res.render('400', invalidProps);
      }

      const ldapEntry = await searchAsyncUid(ldapClient, resetRequest.user);

      logger.debug(`Resetting password for ${resetRequest.user}`);

      const hash = await argon2.hash(value.password, { raw: false });

      await modifyLdap(
        ldapClient,
        ldapEntry.dn,
        new Change({
          operation: 'replace',
          modification: {
            userPassword: `{ARGON2}${hash}`,
          },
        }),
      );

      await resetRequest.delete();
      logger.info(`Password reset successful for ${resetRequest.user}`);
      return res.render('resetPasswordSuccess');
    } else {
      logger.warn(`Password reset key did not match database`);
      return res.render('400', invalidProps);
    }
  } catch (err) {
    next(err);
  }
});

export const accountRouter = router;
