import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('randomgame')
    .setDescription('Fetches a random game from the database.')
    .addStringOption((option) =>
      option
        .setName('genre')
        .setDescription('Filter by game genre')
        .setRequired(false)
        .addChoices(
          { name: 'Action', value: 'action' },
          { name: 'Adventure', value: 'adventure' },
          { name: 'RPG', value: 'rpg' },
          { name: 'Strategy', value: 'strategy' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('platform')
        .setDescription('Filter by game platform')
        .setRequired(false)
        .addChoices(
          { name: 'Windows', value: 'windows' },
          { name: 'Mac', value: 'mac' },
          { name: 'Linux', value: 'linux' },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const genre = interaction.options.getString('genre');
    const platform = interaction.options.getString('platform');

    const queryParams = new URLSearchParams();
    if (genre) queryParams.append('genre', genre);
    if (platform) queryParams.append('platform', platform);

    try {
      const response = await fetch(`${env.API_URL_INTERNAL}/api/games?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.statusText}`);
      }

      const games = await response.json() as Record<string, unknown>[];
      if (games.length === 0) {
        await interaction.editReply('No games found with the specified filters.');
        return;
      }

      const randomGame = games[Math.floor(Math.random() * games.length)]!;

      const steamIds: string[] = ((randomGame.ownedBy as { steamId?: string[] })?.steamId) ?? [];

      let usernamesMap: Record<string, { nickname?: string; username?: string }> = {};
      if (steamIds.length > 0) {
        const usernamesResponse = await fetch(`${env.API_URL_INTERNAL}/api/Games/get-usernames`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(steamIds),
        });

        if (usernamesResponse.ok) {
          usernamesMap = await usernamesResponse.json() as Record<string, { nickname?: string; username?: string }>;
        }
      }

      const platforms = Object.entries((randomGame.platforms as Record<string, boolean>) ?? {})
        .filter(([, v]) => v)
        .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));

      const genres = ((randomGame.genres as { description: string }[]) ?? [])
        .map((g) => g.description)
        .join(', ') || 'Unknown';

      const ownedByDetails = steamIds
        .map((id) => usernamesMap[id]?.nickname ?? usernamesMap[id]?.username ?? 'Unknown User')
        .sort((a, b) => a.localeCompare(b))
        .join(', ') || 'Unknown';

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${randomGame.name as string}`)
        .setURL(`https://store.steampowered.com/app/${randomGame.appid}`)
        .setDescription((randomGame.shortDescription as string) ?? 'No description available.')
        .addFields(
          { name: '💰 Price', value: (randomGame.priceOverview as { finalFormatted?: string })?.finalFormatted ?? ((randomGame.isFree as boolean) ? 'Free' : 'N/A'), inline: true },
          { name: '🔢 App ID', value: String(randomGame.appid), inline: true },
          { name: '🖥️ Platforms', value: platforms.join(', ') || 'Unknown', inline: true },
          { name: '🎯 Genres', value: genres, inline: true },
          { name: '👥 Owned By', value: ownedByDetails },
        )
        .setColor(0x0099ff)
        .setFooter({ text: 'Powered by NerdHub' })
        .setTimestamp();

      const headerImage = randomGame.headerImage as string | undefined;
      if (headerImage) {
        embed.setImage(headerImage);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ error }, 'Error fetching random game');
      await interaction.editReply('An error occurred while fetching a random game.');
    }
  },
};

export default command;
