import * as jf from 'joiful';
import { HttpException } from '../error/httpException';
import * as taskFunctionMap from '../functions/taskFunctionMap';
import { PendingOperation, PendingOperationModel } from '../integration/models';
import { logger } from '../util/logging';

/**
 */
export class AdminPageReq {
  @jf
    .number()
    .not((joi) => joi.negative())
    .default(0)
  page: number;

  @jf.number().positive().max(100).default(10)
  perPage: number;

  @jf
    .array({ elementClass: String })
    .single()
    .items((joi) => joi.valid('pending', 'executed', 'rejected', 'failed'))
    .default('pending')
  status: string[];

  // used to display status when page is re-rendered after task execution

  @jf.string().valid('executed', 'failed', 'rejected').optional()
  opStatus?: 'executed' | 'failed' | 'rejected';

  @jf.string().guid().optional()
  opTask?: string;
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

interface AdminSearchResults {
  results: PendingOperation[];
  totalResults: number;
  pages: number;
}

export const searchTasks = async (query: AdminPageReq): Promise<AdminSearchResults> => {
  const results = await PendingOperationModel.find()
    .in('status', query.status)
    .skip(query.perPage * query.page)
    .limit(query.perPage)
    .sort('-createdTimestamp')
    .exec();
  const numResults = await PendingOperationModel.count().in('status', query.status).exec();
  const numPages = Math.ceil(numResults / query.perPage);
  logger.debug(`Returning ${results.length} of ${numResults} results`);
  return { results: results, totalResults: numResults, pages: numPages };
};

export const modifyTask = async (
  req: AdminModifyTaskReq,
): Promise<'failed' | 'rejected' | 'executed'> => {
  logger.debug(`${req.reject ? 'Rejecting' : 'Accepting'} task ${req.id}`);

  const task = await PendingOperationModel.findById(req.id).exec();

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
      taskFunctionMap.functions[task.operation](task.data);
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
