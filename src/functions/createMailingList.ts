import nodemailer from 'nodemailer';

import { mailTransporter } from '../integration/email';
import { ldapClient } from '../integration/ldap';
import { addMailingList } from '../integration/mailman';
import { generateEmail } from '../util/emailTemplates';
import { searchAsyncUid } from '../util/ldapUtils';
import { logger } from '../util/logging';

export interface CreateMailingListData {
  creator: string;
  listName: string;
}

const isCreateMailingListData = (data: any): data is CreateMailingListData => {
  const testData = data as CreateMailingListData;
  return typeof testData.creator === 'string' && typeof testData.listName === 'string';
};

export const createMailingList = async (data: any) => {
  if (isCreateMailingListData(data)) {
    const user = await searchAsyncUid(ldapClient, data.creator);

    const email = user.email || user.swatmail;
    if (!email) {
      throw new Error(`${data.creator} has no email address listed`);
    }

    await addMailingList(data.listName, email);

    logger.debug(`Sending notification email to ${email}`);

    const [emailText, transporter] = await Promise.all([
      generateEmail('newMailingList.html', {
        listName: data.listName,
        user: data.creator,
      }),
      mailTransporter,
    ]);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Your SCCS mailing list has been created`,
      html: emailText,
    });

    logger.info('Notification email sent');

    const msgUrl = nodemailer.getTestMessageUrl(info);
    if (msgUrl) {
      logger.debug(`View message at ${msgUrl}`);
    }
  } else {
    throw new Error('CreateMailingList data not properly formatted');
  }
};
