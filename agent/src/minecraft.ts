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
    logger.warn('POST whitelist: invalid uuid');
    res.sendStatus(400);
    return;
  }

  const data = await getMinecraftUser(mcUuid);

  logger.info(`Adding ${data.username} to whitelist`);
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

      logger.info(`Added account ${data.username} to whitelist`);

      res.sendStatus(200);
    } catch (e) {
      logger.info(`stdout: ${e.stdout?.toString()?.trimEnd()}`);
      throw new Error(`Error adding account to whitelist: ${e.stderr?.toString()?.trimEnd()}`);
    }
  } else {
    logger.warn('POST whitelist: Minecraft account does not exist');
    res.sendStatus(400);
  }
};

router.post(
  '/:uuid',
  passport.authenticate('bearer', { session: false }),
  catchErrors(async (req, res, next) => {
    await doWhitelist('add', req.params.uuid, res);
  }),
);

router.delete(
  '/:uuid',
  passport.authenticate('bearer', { session: false }),
  catchErrors(async (req, res, next) => {
    await doWhitelist('remove', req.params.uuid, res);
  }),
);

export const minecraftRouter = router;
