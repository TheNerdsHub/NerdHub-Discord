import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('quote-of-the-day')
    .setDescription('Get the quote of the day.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const response = await fetch(`${env.API_URL_INTERNAL}/api/Quotes/daily`);

      if (response.status === 404) {
        await interaction.editReply('No quotes found in the database.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch quote: ${response.statusText}`);
      }

      const quote = await response.json() as {
        quoteText: string;
        quotedPersons: string[];
        submitter: string;
        timestamp: string;
      };

      const embed = new EmbedBuilder()
        .setTitle('📅 Quote of the Day')
        .setDescription(`"${quote.quoteText}"`)
        .addFields(
          { name: '🗣️ Quoted Person(s)', value: quote.quotedPersons.join(', '), inline: true },
          { name: '📝 Submitted by', value: quote.submitter, inline: true },
          { name: '📅 Date', value: new Date(quote.timestamp).toLocaleDateString(), inline: true },
        )
        .setColor(0xffd700)
        .setFooter({ text: 'NerdHub Quotes • Same quote all day!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ error }, 'Error fetching quote of the day');
      await interaction.editReply('An error occurred while fetching the quote of the day.');
    }
  },
};

export default command;
