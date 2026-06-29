import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction, CategoryChannel } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('quote-status')
    .setDescription('Check the current quote monitoring configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await fetch(`${env.API_URL_INTERNAL}/api/QuoteCategories/guild/${interaction.guild.id}`);

      if (response.ok) {
        const config = await response.json() as {
          categoryName: string;
          categoryId: string;
          updatedAt: string;
        };

        const isCategory = !config.categoryName.startsWith('#');

        let description: string;
        const cached = interaction.guild.channels.cache.get(config.categoryId);

        if (cached) {
          if (isCategory) {
            const category = cached as CategoryChannel;
            const textChannels = category.children.cache.filter(
              (ch: { type: number }) => ch.type === ChannelType.GuildText,
            );
            const channelList =
              textChannels.size > 0
                ? `\n\n**Monitoring channels:**\n${textChannels.map((ch: { name: string }) => `\u2022 #${ch.name}`).join('\n')}`
                : '\n\n*No text channels found in this category.*';

            description = `📁 **Category Mode**\nMonitoring all text channels in **${category.name}**${channelList}`;
          } else {
            description = `📝 **Single Channel Mode**\nMonitoring quotes in <#${config.categoryId}>`;
          }
        } else {
          description = `❌ **${isCategory ? 'Category' : 'Channel'} Not Found**\nThe configured ${isCategory ? 'category' : 'channel'} (ID: ${config.categoryId}) no longer exists.`;
        }

        const embed = new EmbedBuilder()
          .setTitle('📊 Quote Monitoring Status')
          .setDescription(description)
          .setColor(0x0099ff)
          .setFooter({ text: `Last updated: ${new Date(config.updatedAt).toLocaleString()}` });

        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('📊 Quote Monitoring Status')
          .setDescription('❌ **No Configuration Found**\n\nQuote monitoring is not currently set up. Use `/set-quote-channel` to configure it.')
          .setColor(0xff9900);

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error({ error }, 'Error checking quote status');

      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to check quote monitoring status. Please try again.')
        .setColor(0xff0000);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
