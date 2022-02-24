import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import unidecode from 'unidecode';

import { mailTransporter } from '../integration/email';
import { ldapClient } from '../integration/ldap';
import { createLocalUser } from '../integration/localAgent';
import { generateEmail } from '../util/emailTemplates';
import { addLdap, searchAsyncMultiple } from '../util/ldapUtils';
import { logger } from '../util/logging';
import { createPasswordResetRequest } from '../util/passwordReset';

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

    const homedir = `/home/${data.classYear}/${data.username}`;
    const webdir = `/srv/users/${data.classYear}/${data.username}`;
    const spool = `/var/spool/mail/${data.username}`;

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
      // gecos field doesn't accept non-ASCII characters, although cn does, so we run the name
      // through transliteration for this bit. See https://github.com/swat-sccs/sauce/issues/4
      gecos: unidecode(data.name),
      userPassword: `{ARGON2}${pw}`,
      swatmail: data.email,
    };

    await addLdap(ldapClient, `uid=${data.username},${process.env.LDAP_SEARCH_BASE}`, ldapAttrs);

    await createLocalUser(data);

    const [resetId, resetKey] = await createPasswordResetRequest(data.username, 24 * 7, true);

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
