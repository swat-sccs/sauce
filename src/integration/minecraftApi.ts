import axios from 'axios';

import { logger } from '../util/logging';

// this currently uses some guy's Cloudflare Workers proxy to the Mojang API to get around rate
// limiting, and to pull down skin, UUID, etc. in one API call.
// https://github.com/Electroid/mojang-api
// Would be fairly trivial to convert to the real Mojang API if necessary but then you're looking at
// a pretty brutal rate limit.

export interface MinecraftUser {
  uuid: string;
  username: string;
  username_history: [
    {
      username: string;
      changed_at?: Date;
    },
  ];
  textures: {
    slim: boolean;
    custom: boolean;
    skin: {
      url: string;
      data: string;
    };
    cape?: {
      url?: string;
      data?: string;
    };
    raw: {
      value: string;
      signature: string;
    };
  };
  legacy: true | null;
  demo: true | null;
  created_at: Date | null;
}

const api = axios.create({
  baseURL: 'https://api.ashcon.app/mojang/v2/user/',
  validateStatus: (status) => true, // we'll handle errors ourselves
});

export const getMinecraftUser = async (usernameOrUuid: string): Promise<MinecraftUser | null> => {
  const response = await api.get(usernameOrUuid);

  if (response.status === 404) {
    logger.debug(`Minecraft user ${usernameOrUuid} not found`);
    return null;
  } else if (response.status === 400) {
    logger.debug(`${usernameOrUuid} is not a valid Minecraft username`);
    return null;
  } else if (response.status != 200) {
    logger.error(`Minecraft username server request error: ${response.statusText}`);
    throw Error(`HTTP request error: ${response.status} ${response.statusText}`);
  } else {
    logger.debug(`Found Minecraft account for ${usernameOrUuid}`);
    return response.data as MinecraftUser;
  }
};
