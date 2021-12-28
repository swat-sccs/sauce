import * as jf from 'joiful';
import { v4 as uuidv4 } from 'uuid';
import { HttpException } from '../error/httpException';
import { listMailingLists } from '../integration/mailman';
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
  return (
    TaskModel.exists({
      operation: 'createMailingList',
      'data.listName': name,
      status: 'pending',
    }) || (await listMailingLists()).some((value) => value['list_name'] === name)
  );
};

export const submitCreateMailingListRequest = async (req: CreateMailingListReq) => {
  if (!isMailingListNameAvailable(req.listName)) {
    throw new HttpException(400, { message: 'Mailing list already exists' });
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
};
