import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('link-steam')
    .setDescription('Link your Discord account to your Steam ID.')
    .addStringOption((option) =>
      option.setName('steamid').setDescription('Your Steam ID (17-digit number)').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('username').setDescription('Your Steam username').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('nickname').setDescription('Your Actual Name').setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const steamId = interaction.options.getString('steamid', true);
    const username = interaction.options.getString('username', true);
    const nickname = interaction.options.getString('nickname') ?? username;
    const discordId = interaction.user.id;

    if (!/^\d{17}$/.test(steamId)) {
      const embed = new EmbedBuilder()
        .setTitle('\u274C Invalid Steam ID')
        .setDescription(
          'Please provide a valid 17-digit Steam ID.\n\n**How to find your Steam ID:**\n' +
            '1. Go to your Steam profile\n' +
            '2. Right-click and select "Copy Page URL"\n' +
            '3. Your Steam ID is the 17-digit number at the end of the URL',
        )
        .setColor(0xff0000);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (username.length < 3 || username.length > 32) {
      const embed = new EmbedBuilder()
        .setTitle('\u274C Invalid Username')
        .setDescription('Steam username must be between 3 and 32 characters long.')
        .setColor(0xff0000);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const response = await fetch(`${env.API_URL_INTERNAL}/api/Games/add-or-update-user-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ steamId, username, nickname, discordId }),
      });

      if (response.ok) {
        const embed = new EmbedBuilder()
          .setTitle('\u2705 Account Linked Successfully!')
          .setDescription(`Your Discord account has been linked to Steam ID: **${steamId}**`)
          .addFields(
            { name: '👤 Steam Username', value: username, inline: true },
            { name: '🏷️ Display Name', value: nickname, inline: true },
            { name: '🆔 Discord ID', value: discordId, inline: true },
          )
          .setColor(0x00ff00)
          .setFooter({ text: 'You can now use commands like /sharedgame!' });
        await interaction.editReply({ embeds: [embed] });
      } else {
        const errorText = await response.text();
        logger.error({ error: errorText }, 'Failed to link Steam account');
        const embed = new EmbedBuilder()
          .setTitle('\u274C Failed to Link Account')
          .setDescription(`An error occurred while linking your accounts.\n\n**Error:** ${errorText}`)
          .setColor(0xff0000);
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error({ error }, 'Error linking Steam account');
      const embed = new EmbedBuilder()
        .setTitle('\u274C Connection Error')
        .setDescription('Unable to connect to the NerdHub backend. Please try again later.')
        .setColor(0xff0000);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
