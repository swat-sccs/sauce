import nodemailer, { TestAccount, Transporter } from 'nodemailer';
import { logger } from '../util/logging';

export const mailTransporter = new Promise<Transporter>((resolve, reject) => {
  // if no SMTP_CONN was provided, create a test account and use that
  new Promise<TestAccount | null>((resolve2, reject2) => {
    resolve2(process.env.SMTP_CONN ? null : nodemailer.createTestAccount());
  }).then((testAccount) => {
    if (testAccount) {
      logger.warn(`Using testing account; messages will not be delivered`);
    }
    const transport = nodemailer.createTransport(
      process.env.SMTP_CONN || {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      },
    );

    transport.verify((err, success) => {
      if (err) {
        logger.error('SMTP server error', err);
        reject(err);
      } else {
        logger.info('SMTP server initialized');
        resolve(transport);
      }
    });
  });
});
