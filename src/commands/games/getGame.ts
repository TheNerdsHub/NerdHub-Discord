import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('getgame')
    .setDescription('Fetches a specific game from the database by App ID or name.')
    .addIntegerOption((option) =>
      option.setName('appid').setDescription('The App ID of the game to fetch').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('name').setDescription('The name of the game to search for').setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const appId = interaction.options.getInteger('appid');
    const gameName = interaction.options.getString('name');

    if (!appId && !gameName) {
      await interaction.editReply('Please provide either an App ID or a game name to search for.');
      return;
    }

    try {
      let game: Record<string, unknown> | null = null;

      if (appId) {
        const response = await fetch(`${env.API_URL_INTERNAL}/api/Games/${appId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch game: ${response.statusText}`);
        }
        const data = await response.json() as Record<string, unknown>;
        if (!data?.name) {
          await interaction.editReply(`No game found with App ID ${appId}.`);
          return;
        }
        game = data;
      } else if (gameName) {
        const response = await fetch(`${env.API_URL_INTERNAL}/api/Games`);
        if (!response.ok) {
          throw new Error(`Failed to fetch games: ${response.statusText}`);
        }

        const allGames = await response.json() as Record<string, unknown>[];

        const exactMatches = allGames.filter(
          (g) => typeof g.name === 'string' && g.name.toLowerCase() === gameName.toLowerCase(),
        );

        if (exactMatches.length > 0) {
          game = exactMatches[0]!;
        } else {
          const partialMatches = allGames.filter(
            (g) => typeof g.name === 'string' && g.name.toLowerCase().includes(gameName.toLowerCase()),
          );

          if (partialMatches.length === 0) {
            await interaction.editReply(`No games found matching "${gameName}".`);
            return;
          }

          if (partialMatches.length === 1) {
            game = partialMatches[0]!;
          } else {
            const matchList = partialMatches
              .slice(0, 10)
              .map((g, i) => `${i + 1}. **${g.name}** (ID: ${g.appid})`)
              .join('\n');

            const embed = new EmbedBuilder()
              .setTitle(`🔍 Multiple games found for "${gameName}"`)
              .setDescription(`Found ${partialMatches.length} games. Showing first 10:\n\n${matchList}`)
              .setColor(0xffa500)
              .setFooter({ text: 'Use /getgame with the specific App ID to get details for a specific game.' });

            await interaction.editReply({ embeds: [embed] });
            return;
          }
        }
      }

      if (!game) {
        await interaction.editReply('No game found.');
        return;
      }

      const ownedBy = game.ownedBy as { steamId?: string[] } | undefined;
      const steamIds: string[] = ownedBy?.steamId ?? [];

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

      const platforms = Object.entries((game.platforms as Record<string, boolean>) ?? {})
        .filter(([, v]) => v)
        .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));

      const genres = ((game.genres as { description: string }[]) ?? [])
        .map((g) => g.description)
        .join(', ') || 'Unknown';

      const ownedByDetails = steamIds
        .map((id) => usernamesMap[id]?.nickname ?? usernamesMap[id]?.username ?? 'Unknown User')
        .sort((a, b) => a.localeCompare(b))
        .join(', ') || 'Unknown';

      const releaseDate = (game.releaseDate as { date?: string })?.date ?? 'Unknown';
      const metacriticScore = (game.metacritic as { score?: number })?.score
        ? `${(game.metacritic as { score: number }).score}/100`
        : 'N/A';
      const developerInfo = (game.developers as string[])?.join(', ') ?? 'Unknown';
      const publisherInfo = (game.publishers as string[])?.join(', ') ?? 'Unknown';
      const categories = (game.categories as { description: string }[])
        ?.slice(0, 5)
        .map((c) => c.description)
        .join(', ') || 'None';

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${game.name as string}`)
        .setURL(`https://store.steampowered.com/app/${game.appid}`)
        .setDescription((game.shortDescription as string) ?? 'No description available.')
        .addFields(
          { name: '💰 Price', value: (game.priceOverview as { finalFormatted?: string })?.finalFormatted ?? ((game.isFree as boolean) ? 'Free' : 'N/A'), inline: true },
          { name: '🔢 App ID', value: String(game.appid), inline: true },
          { name: '🖥️ Platforms', value: platforms.join(', ') || 'Unknown', inline: true },
          { name: '🎯 Genres', value: genres, inline: true },
          { name: '📅 Release Date', value: releaseDate, inline: true },
          { name: '⭐ Metacritic', value: metacriticScore, inline: true },
          { name: '🏗️ Developer', value: developerInfo.length > 50 ? `${developerInfo.slice(0, 47)}...` : developerInfo, inline: true },
          { name: '📢 Publisher', value: publisherInfo.length > 50 ? `${publisherInfo.slice(0, 47)}...` : publisherInfo, inline: true },
          { name: '📂 Categories', value: categories.length > 50 ? `${categories.slice(0, 47)}...` : categories, inline: true },
          { name: '👥 Owned By', value: ownedByDetails.length > 1024 ? `${ownedByDetails.slice(0, 1021)}...` : ownedByDetails },
        )
        .setColor(0x0099ff)
        .setFooter({ text: 'Powered by NerdHub' })
        .setTimestamp();

      const headerImage = game.headerImage as string | undefined;
      if (headerImage) {
        embed.setImage(headerImage);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ error }, 'Error fetching game');
      await interaction.editReply('An error occurred while fetching the game.');
    }
  },
};

export default command;
