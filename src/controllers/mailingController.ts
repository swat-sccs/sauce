import * as jf from 'joiful';
import { v4 as uuidv4 } from 'uuid';

import { ldapClient } from '../integration/ldap';
import { getMailingList } from '../integration/mailman';
import { TaskModel } from '../integration/models';
import { sendTaskNotification } from '../util/emailUtils';
import { searchAsyncUid } from '../util/ldapUtils';
import { logger } from '../util/logging';

// from Ibis's aliases.d file
const RESERVED_MAIL_ADDRS = [
  'staff',
  'internal',
  'mailer-daemon',
  'postmaster',
  'nobody',
  'hostmaster',
  'usenet',
  'news',
  'webmaster',
  'www',
  'ftp',
  'abuse',
  'noc',
  'security',
  'root',
  'guts',
  'www-data',
  'accountant',
];

/**
 */
export class CreateMailingListReq {
  @jf.string().required()
  creator: string;

  @jf.string().lowercase()
  listName: string;
}

export const isMailingListNameAvailable = async (name: string): Promise<boolean> => {
  logger.debug(`Checking if mailing list ${name} exists`);

  // go through various possible places, checking the fastest ones first
  if (RESERVED_MAIL_ADDRS.includes(name)) {
    logger.debug(`${name} is a reserved address`);
    return false;
  }

  if (await searchAsyncUid(ldapClient, name)) {
    logger.debug(`Found user with id ${name}`);
    return false;
  }

  if ((await getMailingList(name)) !== null) {
    logger.debug(`Found existing Mailman list ${name}`);
    return false;
  }

  return true;
};

export const submitCreateMailingListRequest = async (
  req: CreateMailingListReq,
): Promise<boolean> => {
  // TODO also catch reserved thingies e.g. staff
  if (!(await isMailingListNameAvailable(req.listName))) {
    logger.warn(`Mailing list name unavailable: ${req.listName}`);
    return false;
  } else {
    logger.info(`Mailing list name available`);
  }

  logger.info(`Submitting CreateMailingListReq ${JSON.stringify(req)}`);

  const operation = new TaskModel({
    _id: uuidv4(),
    operation: 'createMailingList',
    createdTimestamp: Date.now(),
    data: req,
  });

  await operation.save();

  sendTaskNotification(operation);

  return true;
};
