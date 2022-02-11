import { HttpException } from '../error/httpException';
import { unWhitelistMinecraftUser, whitelistMinecraftUser } from '../integration/localAgent';
import { getMinecraftUser, MinecraftUser } from '../integration/minecraftApi';
import { MinecraftWhitelistModel } from '../integration/models';
import { logger } from '../util/logging';

export const getMcForLdapUser = async (uid: string): Promise<MinecraftUser | null> => {
  logger.debug(`Looking for Minecraft user associated with ${uid}`);

  const userRecord = await MinecraftWhitelistModel.findById(uid).exec();
  if (userRecord) {
    logger.debug(`${uid} is associated with Minecraft UUID ${userRecord.mcUuid}`);
    const mcUser = await getMinecraftUser(userRecord.mcUuid);
    if (!mcUser) {
      logger.warn(`Minecraft UUID ${userRecord.mcUuid} doesn't exist!`);
    }

    return mcUser;
  } else {
    logger.debug(`${uid} is not associated with a Minecraft user`);
    return null;
  }
};

export const associateMcWithLdap = async (uid: string, mcUsernameOrUuid: string) => {
  logger.debug(`Associating SCCS account ${uid} with Minecraft account ${mcUsernameOrUuid}`);

  const mcInfo = await getMinecraftUser(mcUsernameOrUuid);

  if (!mcInfo) {
    throw new HttpException(400, {
      message: `${mcUsernameOrUuid} isn't a valid Minecraft account`,
      friendlyMessage: `That Minecraft account is invalid or doesn't exist.`,
    });
  }

  const dbResult = await MinecraftWhitelistModel.findOne()
    .where('mcUuid')
    .equals(mcInfo.uuid)
    .exec();

  if (dbResult && dbResult._id !== uid) {
    throw new HttpException(400, {
      message: `${mcUsernameOrUuid} is already linked with another user`,
      friendlyMessage: `That username is already linked with another SCCS account.`,
    });
  }

  logger.debug(`Adding ${mcUsernameOrUuid} to database`);
  if (dbResult) {
    await dbResult
      .overwrite({
        _id: uid,
        mcUuid: mcInfo.uuid,
      })
      .save();
  } else {
    await new MinecraftWhitelistModel({
      _id: uid,
      mcUuid: mcInfo.uuid,
    }).save();
  }
  logger.debug(`Whitelisting ${mcUsernameOrUuid} on server`);
  await whitelistMinecraftUser(mcInfo.uuid);

  logger.info(
    `Associated SCCS account ${uid} with Minecraft account ${mcInfo.username} (${mcInfo.uuid})`,
  );
};

export const removeMcAccount = async (uid: string) => {
  logger.debug(`Removing Minecraft account connected to ${uid}`);

  const dbResult = await MinecraftWhitelistModel.findById(uid).exec();
  if (!dbResult) {
    logger.warn(`No Minecraft account was connected for ${uid}`);
  } else {
    logger.warn(`Removing Minecraft account ${dbResult.mcUuid}`);
    await dbResult.delete();
    await unWhitelistMinecraftUser(dbResult.mcUuid);
    logger.info(`Removed Minecraft account ${dbResult.mcUuid} from SCCS account ${uid}`);
  }
};
