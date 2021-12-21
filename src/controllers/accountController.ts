import argon2 from 'argon2';
import * as jf from 'joiful';
import { Change } from 'ldapjs';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { HttpException } from '../error/httpException';
import { mailTransporter } from '../integration/email';
import { ldapClient } from '../integration/ldap';
import { PasswordResetRequest, PasswordResetRequestModel, TaskModel } from '../integration/models';
import { generateEmail } from '../util/emailTemplates';
import { sendTaskNotification } from '../util/emailUtils';
import { modifyLdap, searchAsync, searchAsyncUid } from '../util/ldapUtils';
import { logger } from '../util/logging';
import { testPassword } from '../util/passwordStrength';

export const VALID_CLASSES = ['22', '23', '24', '25', 'faculty', 'staff'];
// TODO: do we have accounts in the system that don't match this username pattern?
export const USERNAME_OR_EMAIL_REGEX =
  /^[a-z][-a-z0-9]*$|^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:.[a-zA-Z0-9-]+)*$/;

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;

/**
 */
export class CreateAccountReq {
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

export const submitCreateAccountRequest = async (req: CreateAccountReq) => {
  // TODO how do we handle someone going to create an account if they're
  // already logged in?

  if (!isUsernameAvailable(req.username)) {
    throw new HttpException(400, { message: `Username ${req.username} already exists` });
  }

  if (!isEmailAvailable(req.email)) {
    throw new HttpException(400, {
      message: `Email ${req.email} is  already associated with an account`,
    });
  }

  logger.info(`Submitting CreateAccountReq ${JSON.stringify(req)}`);
  const operation = new TaskModel({
    _id: uuidv4(),
    operation: 'createAccount',
    createdTimestamp: Date.now(),
    data: req,
  });

  await operation.save();

  sendTaskNotification(operation);
};

export const createPasswordResetRequest = async (identifier: string) => {
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

/**
 */
export class PasswordResetCredentials {
  @jf.string().required()
  id: string;
  @jf.string().required()
  key: string;
}

/**
 */
export class PasswordResetRequestParams extends PasswordResetCredentials {
  // we'll properly validate it later
  @jf.string().required()
  password: string;
}

/**
 * Verifies a set of credentials against the database. Returns the associated request on success;
 * throws an appropriate `HttpException` on failure.
 * @param {PasswordResetCredentials} creds The credentials to check
 */
export const verifyPasswordReset = async (
  creds: PasswordResetCredentials,
): Promise<PasswordResetRequest> => {
  const invalidProps = {
    friendlyMessage:
      'This password reset link is invalid or expired. <a href="/account/forgot">Request a new one</a>.',
  };

  const resetRequest = await PasswordResetRequestModel.findById(creds.id);
  if (!resetRequest) {
    throw new HttpException(400, {
      ...invalidProps,
      message: `Password reset ID ${creds.id} did not match any request`,
    });
  }

  if (!(await argon2.verify(resetRequest.key, creds.key as string))) {
    throw new HttpException(400, {
      ...invalidProps,
      message: 'Password reset key did not match database',
    });
  }
  return resetRequest;
};

export const doPasswordReset = async (params: PasswordResetRequestParams) => {
  const resetRequest = await verifyPasswordReset(params);

  // now we check the password
  const testResult = await testPassword(params.password);
  if (testResult.score < 2) {
    // this really shouldn't happen if they submitted something via the web form
    throw new HttpException(400, {
      friendlyMessage:
        'The password provided was too weak. This might be because of a bug in the form. Choose a stronger password and try again.',
      message: 'Provided password was too weak',
    });
  }

  const ldapEntry = await searchAsyncUid(ldapClient, resetRequest.user);

  logger.debug(`Resetting password for ${resetRequest.user}`);

  const hash = await argon2.hash(params.password, { raw: false });

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
      await PasswordResetRequestModel.findByIdAndDelete(resetRequest._id);

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
};

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const [inDatabase, inPending] = await Promise.all([
    searchAsyncUid(ldapClient, username),
    TaskModel.exists({ 'data.username': username, status: 'pending' }),
  ]);

  if (inDatabase || inPending) {
    logger.debug(`${username} already exists`);
    return false;
  } else {
    logger.debug(`${username} does not already exist`);
    return true;
  }
};

export const isEmailAvailable = async (email: string): Promise<boolean> => {
  const [inDatabase, inPending] = await Promise.all([
    searchAsync(ldapClient, `(swatmail=${email})`),
    TaskModel.exists({ 'data.email': email, status: 'pending' }),
  ]);

  if (inDatabase || inPending) {
    logger.debug(`${email} is already registered`);
    return false;
  } else {
    logger.debug(`${email} is not already registered`);
    return true;
  }
};
