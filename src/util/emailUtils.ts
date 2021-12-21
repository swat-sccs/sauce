import { mailTransporter } from '../integration/email';
import { Task } from '../integration/models';
import { generateEmail } from './emailTemplates';
import nodemailer from 'nodemailer';
import { logger } from './logging';

export const sendTaskNotification = async (task: Task) => {
  try {
    const [emailText, transporter] = await Promise.all([
      generateEmail('taskNotification.html', {
        id: task._id,
        operation: task.operation,
        dataString: JSON.stringify(task.data, null, 2),
        domain: process.env.EXTERNAL_ADDRESS,
      }),
      mailTransporter,
    ]);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `[SAUCE] ${task.operation} task waiting for review`,
      html: emailText,
    });

    const msgUrl = nodemailer.getTestMessageUrl(info);
    if (msgUrl) {
      logger.debug(`View message at ${msgUrl}`);
    }
  } catch (err) {
    logger.error('Error sending task notification email', err);
  }
};
