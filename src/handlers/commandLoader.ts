import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Client } from 'discord.js';
import type { Command } from '../types.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commandsPath = join(__dirname, '..', 'commands');

export async function loadCommands(client: Client): Promise<void> {
  const categoryFolders = readdirSync(commandsPath, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const folder of categoryFolders) {
    const categoryPath = join(commandsPath, folder.name);
    const commandFiles = readdirSync(categoryPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = join(categoryPath, file);
      const commandModule = (await import(filePath)) as { default: unknown };
      const command = commandModule.default as Command;

      if (command && typeof command === 'object' && 'data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.debug({ command: command.data.name, category: folder.name }, 'Loaded command');
      } else {
        logger.warn({ file: filePath }, 'Command missing required "data" or "execute" property');
      }
    }
  }

  logger.info({ count: client.commands.size }, 'All commands loaded');
}
