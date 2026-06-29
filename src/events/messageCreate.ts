import { Events } from 'discord.js';
import type { Message } from 'discord.js';
import { handleQuoteMessage } from '../services/quoteService.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message): Promise<void> {
  await handleQuoteMessage(message);
}
