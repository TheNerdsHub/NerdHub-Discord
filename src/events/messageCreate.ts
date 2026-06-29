import { Events } from 'discord.js';
import type { Message } from 'discord.js';
import { handleQuoteMessage } from '../services/quoteService.js';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message): Promise<void> {
    await handleQuoteMessage(message);
  }
};
