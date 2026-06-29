import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Client, ClientEvents } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eventsPath = join(__dirname, '..', 'events');

export async function loadEvents(client: Client): Promise<void> {
  const eventFiles = readdirSync(eventsPath).filter((f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const eventModule = (await import(pathToFileURL(filePath).href)) as { default: unknown };
    const event = eventModule.default as { name: keyof ClientEvents; once?: boolean; execute: (...args: unknown[]) => void };

    if (event.once) {
      client.once(event.name, (...args: unknown[]) => { event.execute(...args); });
    } else {
      client.on(event.name, (...args: unknown[]) => { event.execute(...args); });
    }
  }

  logger.info({ count: eventFiles.length }, 'Loaded events');
}
