import { Events } from 'discord.js';
import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>): void {
    logger.info({ user: client.user.tag }, 'Bot is ready');
  }
};
