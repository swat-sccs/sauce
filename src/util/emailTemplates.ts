import fs from 'fs';

import { logger } from './logging';

// one-line template engine from https://stackoverflow.com/a/41077811
export const generateEmail = async (templateName: string, params: any): Promise<string> => {
  logger.debug(`Reading email template ${templateName}`);
  return new Promise((resolve, reject) => {
    fs.readFile(`emailTemplates/${templateName}`, {}, (err, data) => {
      if (err) {
        logger.error('Error reading email template', err);
        reject(err);
      } else {
        try {
          resolve(
            data
              .toString('utf8')
              .replace(
                /\${([^}]*)}/g,
                (r, k) => params[k] || reject(new Error(`No value provided for ${k}`)),
              ),
          );
        } catch (err) {
          logger.error('Error parsing email template', err);
          reject(err);
        }
      }
    });
  });
};
