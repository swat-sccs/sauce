import * as jf from 'joiful';
import { v4 as uuidv4 } from 'uuid';
import { HttpException } from '../error/httpException';
import { getMailingList, listMailingLists } from '../integration/mailman';
import { TaskModel } from '../integration/models';
import { sendTaskNotification } from '../util/emailUtils';
import { logger } from '../util/logging';
/**
 */
export class CreateMailingListReq {
  @jf.string().required()
  creator: string;

  @jf.string()
  listName: string;
}

export const isMailingListNameAvailable = async (name: string): Promise<boolean> => {
  logger.debug(`Checking if mailing list ${name} exists`);
  return !(
    (await TaskModel.exists({
      operation: 'createMailingList',
      'data.listName': name,
      status: 'pending',
    })) || (await getMailingList(name)) !== null
  );
};

export const submitCreateMailingListRequest = async (
  req: CreateMailingListReq,
): Promise<boolean> => {
  // TODO also catch reserved thingies e.g. staff
  if (!(await isMailingListNameAvailable(req.listName))) {
    logger.warn(`Mailing list already exists: ${req.listName}`);
    return false;
  } else {
    logger.info(`Mailing list does not already exist`);
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
