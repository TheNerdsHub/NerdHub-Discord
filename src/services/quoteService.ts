import type { Message } from 'discord.js';
import type { QuoteConfig, QuoteParseResult } from '../types.js';
import { env } from '../config.js';
import { logger } from '../utils/logger.js';

async function loadQuoteMonitoringConfig(guildId: string): Promise<QuoteConfig | null> {
  try {
    const response = await fetch(`${env.API_URL_INTERNAL}/api/QuoteCategories/guild/${guildId}`);

    if (response.ok) {
      const config = await response.json() as { categoryId: string; categoryName: string };
      return {
        type: config.categoryName.startsWith('#') ? 'single' : 'category',
        id: config.categoryId,
        name: config.categoryName,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function shouldMonitorMessage(message: Message, config: QuoteConfig | null): boolean {
  if (!config || message.author.bot) {
    return false;
  }

  if (config.type === 'single') {
    return message.channelId === config.id;
  }

  if (!message.channel.isTextBased() || message.channel.isDMBased()) {
    return false;
  }

  return message.channel.parent?.id === config.id && message.channel.type === 0;
}

function parseQuote(content: string): QuoteParseResult | null {
  const trimmed = content.trim();

  const singleQuoteMatch = /^"(.+)"\s*-\s*(.+)$/.exec(trimmed);
  if (singleQuoteMatch?.[1] && singleQuoteMatch[2]) {
    return {
      quoteText: singleQuoteMatch[1].trim(),
      quotedPersons: [singleQuoteMatch[2].trim()],
    };
  }

  const lines = trimmed.split('\n').filter((l) => l.trim());
  const isMultiQuote = lines.length > 1 && lines.every((l) => /^[^:]+:\s*".*"?\s*$/.test(l));

  if (isMultiQuote) {
    const quotedPersons: string[] = [];
    const quoteParts: string[] = [];

    for (const line of lines) {
      const match = /^([^:]+):\s*"(.*)"\s*$/.exec(line);
      const person = match?.[1]?.trim();
      const text = match?.[2]?.trim();
      if (person && text) {
        quotedPersons.push(person);
        quoteParts.push(`${person}: "${text}"`);
      }
    }

    if (quotedPersons.length > 0) {
      return {
        quoteText: quoteParts.join('\n'),
        quotedPersons: [...new Set(quotedPersons)],
      };
    }
  }

  return null;
}

export async function handleQuoteMessage(message: Message): Promise<void> {
  if (!message.guild) return;

  const monitoringConfig = await loadQuoteMonitoringConfig(message.guild.id);

  if (!shouldMonitorMessage(message, monitoringConfig)) {
    return;
  }

  const parsedQuote = parseQuote(message.content);
  if (!parsedQuote) {
    return;
  }

  try {
    const response = await fetch(`${env.API_URL_INTERNAL}/api/Quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteText: parsedQuote.quoteText,
        quotedPersons: parsedQuote.quotedPersons,
        submitter: message.author.displayName || message.author.username,
        discordUserId: message.author.id,
        channelId: message.channelId,
        channelName: message.channel.isTextBased() && 'name' in message.channel ? (message.channel as { name: string }).name : null,
        messageId: message.id,
        timestamp: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      logger.info({ quote: parsedQuote.quoteText, channel: message.channelId }, 'Quote saved');
      await message.react('📝');
    } else {
      logger.error({ status: response.status, body: await response.text() }, 'Failed to save quote');
    }
  } catch (error) {
    logger.error({ error }, 'Error saving quote');
  }
}
