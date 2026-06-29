import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction, CategoryChannel } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('set-quote-channel')
    .setDescription('Set a single channel or category to monitor for quotes.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Text channel or category to monitor for quotes')
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel', true);
    const isCategory = channel.type === ChannelType.GuildCategory;

    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildCategory) {
      await interaction.editReply('Please select either a text channel or a category.');
      return;
    }

    try {
      const body = {
        guildId: interaction.guild.id,
        categoryId: channel.id,
        categoryName: isCategory ? channel.name : `#${channel.name}`,
      };

      const response = await fetch(`${env.API_URL_INTERNAL}/api/QuoteCategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        let description: string;
        let title: string;

        if (isCategory) {
          const category = channel as CategoryChannel;
          const textChannels = category.children.cache.filter(
            (ch: { type: number }) => ch.type === ChannelType.GuildText,
          );
          const channelList =
            textChannels.size > 0
              ? `\n\n**Monitoring channels:**\n${textChannels.map((ch: { name: string }) => `\u2022 #${ch.name}`).join('\n')}`
              : '\n\n*No text channels found in this category.*';

          description = `Quote monitoring is now active in all text channels within **${channel.name}**${channelList}`;
          title = '✅ Quote Category Set';
        } else {
          description = `Quote monitoring is now active in ${channel}`;
          title = '✅ Quote Channel Set';
        }

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(0x00ff00);

        await interaction.editReply({ embeds: [embed] });
      } else {
        throw new Error(`Failed to save: ${response.statusText}`);
      }
    } catch (error) {
      logger.error({ error }, 'Error setting quote channel/category');

      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to set quote monitoring. Please try again.')
        .setColor(0xff0000);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
