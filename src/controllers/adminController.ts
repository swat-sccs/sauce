import * as jf from 'joiful';
import { HttpException } from '../error/httpException';
import * as taskFunctionMap from '../functions/taskFunctionMap';
import { Task, TaskModel } from '../integration/models';
import { logger } from '../util/logging';

/**
 */
export class AdminSearchReq {
  @jf
    .array({ elementClass: String })
    .single()
    .items((joi) => joi.valid('pending', 'executed', 'rejected', 'failed'))
    .default('pending')
  status: string[];

  @jf.any().optional()
  '_': any;
}

/**
 */
export class AdminModifyTaskReq {
  @jf.string().guid({ version: 'uuidv4' }).required()
  id: string;

  @jf.boolean().default(false)
  reject: boolean; // if true, reject, otherwise, execute

  /**
   * Query for the originating admin page. Used to preserve e.g. search
   * parameters when redirecting.
   */
  @jf.string().default('')
  query: string;
}

export const searchTasks = async (query: AdminSearchReq): Promise<Task[]> => {
  const results = await TaskModel.find().in('status', query.status).exec();
  logger.debug(`Returning ${results.length} results`);
  return results;
};

export const modifyTask = async (
  req: AdminModifyTaskReq,
): Promise<'failed' | 'rejected' | 'executed'> => {
  logger.debug(`${req.reject ? 'Rejecting' : 'Accepting'} task ${req.id}`);

  const task = await TaskModel.findById(req.id).exec();

  if (!task) {
    logger.warn(`Task ${req.id} not found`);
    throw new HttpException(400, { message: `Task ${req.id} not found` });
  }

  if (task.status === 'executed' || task.status === 'rejected') {
    logger.warn(`Task ${req.id} is ${task.status} and cannot be modified`);
    throw new HttpException(400, {
      message: `Task ${req.id} is ${task.status} and cannot be modified`,
    });
  }

  if (req.reject) {
    logger.info(`Rejecting ${task.operation} task ${req.id}`);
    task.status = 'rejected';
    task.actionTimestamp = new Date();
    await task.save();

    return 'rejected';
  } else {
    logger.debug(`Executing ${task.operation} task ${req.id}`);
    try {
      await taskFunctionMap.functions[task.operation](task.data);
    } catch (err) {
      logger.error(`Execution of ${task.operation} task ${req.id} failed`, err);
      task.actionTimestamp = new Date();
      task.data['error'] = err.toString();
      task.markModified('data');
      task.status = 'failed';
      await task.save();
      logger.debug('Saved failure record to database');

      return 'failed';
    }

    task.actionTimestamp = new Date();
    task.status = 'executed';

    await task.save();
    logger.info(`Successfully executed ${task.operation} task ${req.id}`);

    return 'executed';
  }
};
