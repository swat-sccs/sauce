import argon2 from 'argon2';
import { promises as fs } from 'fs';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { mailTransporter } from '../integration/email';
import { ldapClient } from '../integration/ldap';
import { generateEmail } from '../util/emailTemplates';
import { addLdap, searchAsyncMultiple } from '../util/ldapUtils';
import { logger } from '../util/logging';
import { createPasswordResetRequest } from '../util/passwordReset';
import chownr from 'chownr';
import chmodr from 'chmodr';
import { exec } from 'child_process';
import { createLocalUser } from '../integration/localAgent';

export interface CreateAccountData {
  username: string;
  email: string;
  name: string;
  classYear: string;
}

const isCreateAccountData = (data: any): data is CreateAccountData => {
  const testData = data as CreateAccountData;
  return (
    typeof testData.username === 'string' &&
    typeof testData.email === 'string' &&
    typeof testData.name === 'string' &&
    typeof testData.classYear === 'string'
  );
};

// TODO blocking/locks for this?
export const createAccount = async (data: any) => {
  if (isCreateAccountData(data)) {
    logger.info(`Creating account for ${data.username}`);

    const homedir = `${process.env.BASE_DIR}/home/${data.classYear}/${data.username}`;
    const webdir = `${process.env.BASE_DIR}/srv/users/${data.classYear}/${data.username}`;
    const spool = `${process.env.BASE_DIR}/var/spool/mail/${data.username}`;

    // create a new UID by finding the highest existing UID and adding 1
    const uids = (await searchAsyncMultiple(ldapClient, 'objectClass=posixAccount', ['uidNumber']))
      .map((result) => +result.uidNumber)
      .sort((a, b) => a - b);
    const newUid = uids[uids.length - 1] + 1;

    // set a random unguessable password
    const pw = await argon2.hash(nanoid(), { raw: false });

    const ldapAttrs = {
      objectClass: ['account', 'posixAccount', 'shadowAccount'],
      cn: data.name,
      uid: data.username,
      gidNumber: '100',
      uidNumber: newUid,
      homeDirectory: homedir,
      loginShell: '/bin/bash',
      gecos: data.name,
      userPassword: `{ARGON2}${pw}`,
      swatmail: data.email,
    };

    // FIXME figure out file permissions
    await addLdap(ldapClient, `uid=${data.username},${process.env.LDAP_SEARCH_BASE}`, ldapAttrs);

    createLocalUser(data);

    const [resetId, resetKey] = await createPasswordResetRequest(data.username, 24 * 7);

    const [emailText, transporter] = await Promise.all([
      generateEmail('newAccount.html', {
        username: data.username,
        domain: process.env.EXTERNAL_ADDRESS,
        resetKey: resetKey,
        resetId: resetId,
      }),
      mailTransporter,
    ]);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: data.email,
      subject: 'Create an SCCS Password',
      html: emailText,
    });

    const msgUrl = nodemailer.getTestMessageUrl(info);
    if (msgUrl) {
      logger.debug(`View message at ${msgUrl}`);
    }
  } else {
    throw new Error('CreateAccount data not properly formatted');
  }
};
