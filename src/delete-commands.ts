import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import { logger } from './utils/logger.js';

const args = process.argv.slice(2);
const clientId = args[0];
const guildId = args[1];
const token = process.env.DISCORD_BOT_TOKEN;

if (!clientId || !token) {
  logger.error('Usage: tsx src/delete-commands.ts <clientId> [guildId]');
  process.exit(1);
}

const rest = new REST().setToken(token);

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
  logger.info('Successfully deleted all guild commands.');
} else {
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  logger.info('Successfully deleted all global commands.');
}
