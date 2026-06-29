import { Events } from 'discord.js';
import type { Interaction } from 'discord.js';
import { checkCooldown } from '../lib/cooldowns.js';
import { logger } from '../utils/logger.js';

const EPHEMERAL = 64;

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn({ command: interaction.commandName }, 'Unknown command');
    return;
  }

  if (command.cooldown) {
    const remaining = checkCooldown(interaction.user.id, interaction.commandName, command.cooldown);
    if (remaining !== null) {
      await interaction.reply({
        content: `Please wait ${remaining} second(s) before using this command again.`,
        flags: EPHEMERAL,
      });
      return;
    }
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error({ error, command: interaction.commandName, user: interaction.user.id }, 'Command execution error');
    const reply = { content: 'There was an error while executing this command!', flags: EPHEMERAL };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
};
