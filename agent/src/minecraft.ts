import { Router } from 'express';
import passport from 'passport';
import { catchErrors, logger } from './util';
import { validate } from 'uuid';
import { getMinecraftUser } from './minecraftApi';
import { execFileSync } from 'child_process';
import { Response } from 'express';

// eslint-disable-next-line new-cap
const router = Router();

const doWhitelist = async (
  op: 'add' | 'remove',
  mcUuid: string | undefined,
  res: Response<any, Record<string, any>>,
) => {
  if (!validate(mcUuid)) {
    logger.warn('Invalid minecraft uuid');
    res.sendStatus(400);
    return;
  }

  const data = await getMinecraftUser(mcUuid);

  logger.info(`Starting: ${op} account ${data.username} to/from whitelist`);
  if (data) {
    try {
      const stdout = execFileSync(process.env.MINECRAFT_SERVER_EXEC_PATH, [
        'command',
        'whitelist',
        op,
        data.username,
      ]);
      if (stdout) {
        logger.info(`server_exec stdout: ${stdout.toString().trimEnd()}`);
      }

      logger.info(`Finished: ${op} account ${data.username} to/from whitelist`);

      res.sendStatus(200);
    } catch (e) {
      logger.info(`stdout: ${e.stdout?.toString()?.trimEnd()}`);
      throw new Error(`Error: ${op} account to/from whitelist: ${e.stderr?.toString()?.trimEnd()}`);
    }
  } else {
    logger.warn('Minecraft account does not exist');
    res.sendStatus(400);
  }
};

router.post(
  '/:uuid',
  catchErrors(async (req, res, next) => {
    await doWhitelist('add', req.params.uuid, res);
  }),
);

router.delete(
  '/:uuid',
  catchErrors(async (req, res, next) => {
    await doWhitelist('remove', req.params.uuid, res);
  }),
);

export const minecraftRouter = router;
