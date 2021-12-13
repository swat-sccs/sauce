import argon2 from 'argon2';
import { Router } from 'express';
import * as jf from 'joiful';
import { Change } from 'ldapjs';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { HttpException } from '../error/httpException';
import { mailTransporter } from '../integration/email';
import { ldapClient } from '../integration/ldap';
import { PasswordResetRequestModel, PendingOperationModel } from '../integration/models';
import { catchErrors } from '../util/asyncCatch';
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

router.get(
  '/create',
  catchErrors((req, res, next) => {
    // TODO how do we handle someone going to create an account if they're
    //  already logged in?

    res.render('createAccount', { classes: VALID_CLASSES });
  }),
);

router.post(
  '/create',
  catchErrors(async (req: any, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, CreateAccountReq);

    if (error) {
      logger.warn(`CreateAccountReq validation error: ${error.message}`);
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    // TODO also search and see if that user ID is in the creation queue
    if (await searchAsyncUid(ldapClient, req.params.username)) {
      throw new HttpException(400, { message: `Username ${req.params.username} already exists` });
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
  }),
);

router.get(
  '/username-ok/:username',
  catchErrors(async (req: any, res, next) => {
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
  }),
);

router.get(
  '/email-ok/:email',
  catchErrors(async (req: any, res, next) => {
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
  }),
);

router.get(
  '/forgot',
  catchErrors((req, res, next) => {
    res.render('forgot', { done: false, inputRegex: USERNAME_OR_EMAIL_REGEX.source });
  }),
);

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
        key: await argon2.hash(resetKey, { raw: false }),
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

router.post(
  '/forgot',
  catchErrors((req: any, res, next) => {
    const identifier = req.body.id;
    if (!identifier) {
      logger.warn('ForgotRequest had missing ID');
      throw new HttpException(400, { message: 'Missing request parameter: id' });
    }

    if (!USERNAME_OR_EMAIL_REGEX.test(identifier)) {
      logger.warn(`ForgotRequest: id ${identifier} isn't a valid username or email`);
      throw new HttpException(400, { message: 'ID must be a valid username or email' });
    }

    // this runs asynchronously after we reply, so we get super-quick page returns and also prevent
    // enumeration attacks.
    processPasswordReset(identifier);

    res.render('forgot', { done: true });
  }),
);

router.get(
  '/reset',
  catchErrors(async (req, res, next) => {
    const id = req.query.id;
    const key = req.query.key;

    const invalidProps = {
      friendlyMessage:
        'This password reset link is invalid or expired. <a href="/account/forgot">Request a new one</a>.',
    };

    if (!id || !key || !(typeof key === 'string' || key instanceof String)) {
      throw new HttpException(400, {
        ...invalidProps,
        message: 'Password reset request missing query params',
      });
    }

    const resetRequest = await PasswordResetRequestModel.findById(id);
    if (!resetRequest) {
      throw new HttpException(400, {
        ...invalidProps,
        message: `Password reset ID ${id} did not match any request`,
      });
    }

    if (await argon2.verify(resetRequest.key, key as string)) {
      return res.render('resetPassword', { id: id, key: key, username: resetRequest.user });
    } else {
      throw new HttpException(400, {
        ...invalidProps,
        message: 'Password reset key did not match database',
      });
    }
  }),
);

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

router.post(
  '/reset',
  catchErrors(async (req, res, next) => {
    const { error, value } = jf.validateAsClass(req.body, ResetPasswordReq);
    if (error) {
      throw new HttpException(400, { message: `Invalid request: ${error.message}` });
    }

    const invalidProps = {
      friendlyMessage:
        'The password reset request you used is invalid or expired. Your password has not been changed, but you\'ll need to <a href="/account/forgot">request a new password reset link</a>.',
    };

    const resetRequest = await PasswordResetRequestModel.findById(value.id);

    if (!resetRequest) {
      throw new HttpException(400, {
        ...invalidProps,
        message: `Password reset ID ${value.id} did not match any request`,
      });
    }

    if (await argon2.verify(resetRequest.key, value.key as string)) {
      // now we check the password
      const testResult = await testPassword(value.password);
      if (testResult.score < 2) {
        // this really shouldn't happen if they submitted something via the web form
        throw new HttpException(400, {
          ...invalidProps,
          message: 'Provided password was too weak',
        });
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

      // spin off an async function here to do the slow stuff
      (async () => {
        try {
          await resetRequest.delete();

          if (!resetRequest.suppressEmail) {
            /* 
            We send the email to their primary email, but if that's not their Swarthmore email we
            BCC that one too. This is to guard against a potential attack where an attacker could 
            register a new email and change the password without the user knowing.
            */
            const emailTo = ldapEntry.email || ldapEntry.swatmail;
            const emailBcc = ldapEntry.email ? ldapEntry.swatmail : undefined;

            logger.debug(
              `Sending notification email to ${emailTo}${emailBcc ? `(bcc: ${emailBcc})` : ''}`,
            );
            const [emailText, transporter] = await Promise.all([
              generateEmail('passwordResetNotification.html', {
                username: resetRequest.user,
                domain: process.env.EXTERNAL_ADDRESS,
              }),
              mailTransporter,
            ]);

            const info = await transporter.sendMail({
              from: process.env.EMAIL_FROM,
              to: emailTo,
              bcc: emailBcc,
              subject: 'Your SCCS password was reset',
              html: emailText,
            });

            const msgUrl = nodemailer.getTestMessageUrl(info);
            if (msgUrl) {
              logger.debug(`View message at ${msgUrl}`);
            }
          } else {
            logger.debug('Suppressing notification email');
          }
        } catch (err) {
          logger.error('Error performing post-reset tasks: ', err);
        }
      })();

      logger.info(`Password reset successful for ${resetRequest.user}`);
      return res.render('resetPasswordSuccess');
    } else {
      throw new HttpException(400, {
        ...invalidProps,
        message: 'Password reset key did not match database',
      });
    }
  }),
);

export const accountRouter = router;
