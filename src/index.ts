import { env } from './config.js';
import { logger } from './utils/logger.js';
import { createClient } from './client.js';
import { loadCommands } from './handlers/commandLoader.js';
import { loadEvents } from './handlers/eventLoader.js';

process.on('unhandledRejection', (reason) => {
  logger.error({ error: reason }, 'Unhandled rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

async function main(): Promise<void> {
  const client = createClient();

  await loadCommands(client);
  await loadEvents(client);

  await client.login(env.DISCORD_BOT_TOKEN);
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start bot');
  process.exit(1);
});
