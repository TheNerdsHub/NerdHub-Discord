import { Events } from 'discord.js';
import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>): void {
  logger.info({ user: client.user.tag }, 'Bot is ready');
}
