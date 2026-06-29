import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import { logger } from './utils/logger.js';
import type { Command } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const clientId = args[0];
const guildId = args[1];
const token = process.env.DISCORD_BOT_TOKEN;

if (!clientId || !token) {
  logger.error('Usage: tsx src/deploy-commands.ts <clientId> [guildId]');
  process.exit(1);
}

const commands: unknown[] = [];
const commandsPath = join(__dirname, 'commands');
const categoryFolders = readdirSync(commandsPath, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const folder of categoryFolders) {
  const categoryPath = join(commandsPath, folder.name);
  const commandFiles = readdirSync(categoryPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(categoryPath, file);
    const commandModule = (await import(pathToFileURL(filePath).href)) as { default: unknown };
    const command = commandModule.default as Command;

    if (command && typeof command === 'object' && 'data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      logger.warn({ file: filePath }, 'Command missing required properties');
    }
  }
}

const rest = new REST().setToken(token);

try {
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  const data = await rest.put(route, { body: commands });
  logger.info({ count: (data as unknown[]).length }, 'Successfully registered commands');
} catch (error) {
  logger.error({ error }, 'Failed to register commands');
  process.exit(1);
}
