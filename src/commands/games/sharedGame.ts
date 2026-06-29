import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, VoiceChannel, GuildMember } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';
import { logger } from '../../utils/logger.js';

interface UserMapping {
  steamId: string;
  discordId: string;
  username: string;
  nickname?: string;
}

async function mapDiscordToSteam(discordId: string, userMappings: UserMapping[]): Promise<string | null> {
  const mapping = userMappings.find((u) => u.discordId === discordId);
  return mapping?.steamId ?? null;
}

async function parseUserList(
  usersString: string,
  userMappings: UserMapping[],
): Promise<{ steamIds: string[]; userDisplayNames: Map<string, string>; notFound: string[] }> {
  const userEntries = usersString.split(',').map((e) => e.trim()).filter((e) => e.length > 0);
  const steamIds: string[] = [];
  const userDisplayNames = new Map<string, string>();
  const notFound: string[] = [];

  for (const userEntry of userEntries) {
    let mapping: UserMapping | undefined;

    if (/^\d{17}$/.test(userEntry)) {
      mapping = userMappings.find((u) => u.steamId === userEntry);
    } else {
      mapping = userMappings.find(
        (u) =>
          u.username.toLowerCase() === userEntry.toLowerCase() ||
          (u.nickname?.toLowerCase() === userEntry.toLowerCase()),
      );
    }

    if (mapping) {
      steamIds.push(mapping.steamId);
      userDisplayNames.set(mapping.steamId, mapping.nickname ?? mapping.username);
    } else {
      notFound.push(userEntry);
    }
  }

  return { steamIds, userDisplayNames, notFound };
}

function applyBlacklist(
  members: Map<string, GuildMember>,
  blacklistString: string,
): { filteredMembers: Map<string, GuildMember>; blacklistedUsers: string[] } {
  const blacklistEntries = blacklistString
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  const filteredMembers = new Map<string, GuildMember>();
  const blacklistedUsers: string[] = [];

  for (const [memberId, member] of members) {
    const displayName = member.displayName.toLowerCase();
    const username = member.user.username.toLowerCase();
    const globalName = member.user.globalName?.toLowerCase() ?? '';

    const isBlacklisted = blacklistEntries.some(
      (entry) =>
        displayName.includes(entry) || username.includes(entry) || globalName.includes(entry),
    );

    if (isBlacklisted) {
      blacklistedUsers.push(member.displayName);
    } else {
      filteredMembers.set(memberId, member);
    }
  }

  return { filteredMembers, blacklistedUsers };
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('sharedgame')
    .setDescription('Find games owned by all users in a voice channel.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The voice channel to check (defaults to your current voice channel)')
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Maximum number of games to show (default: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25),
    )
    .addStringOption((option) =>
      option
        .setName('blacklist')
        .setDescription('Comma-separated list of users to exclude from voice channel search')
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('users')
        .setDescription('Comma-separated list of users to check (by nickname, username, or Steam ID)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const specifiedChannel = interaction.options.getChannel('channel');
    const limit = interaction.options.getInteger('limit') ?? 10;
    const blacklistString = interaction.options.getString('blacklist');
    const usersString = interaction.options.getString('users');

    try {
      const userMappingsResponse = await fetch(`${env.API_URL_INTERNAL}/api/Games/get-all-usernames`);
      if (!userMappingsResponse.ok) {
        throw new Error('Failed to fetch user mappings');
      }
      const userMappings = await userMappingsResponse.json() as UserMapping[];

      let steamIds: string[] = [];
      const userDisplayNames = new Map<string, string>();
      let searchContext = '';
      let blacklistedUsers: string[] = [];

      if (usersString) {
        const result = await parseUserList(usersString, userMappings);
        steamIds = result.steamIds;
        for (const [k, v] of result.userDisplayNames) {
          userDisplayNames.set(k, v);
        }
        searchContext = 'Manual Selection';

        if (result.notFound.length > 0) {
          await interaction.followUp({
            content: `**Warning:** Could not find Steam accounts for: ${result.notFound.join(', ')}. Make sure they've used \`/link-steam\` to register.`,
            flags: 64,
          });
        }
      } else {
        let voiceChannel = specifiedChannel as VoiceChannel | null;

        if (!voiceChannel) {
          const member = interaction.member;
          if (member && 'voice' in member && member.voice.channel) {
            voiceChannel = member.voice.channel as VoiceChannel;
          } else {
            await interaction.editReply(
              'You are not in a voice channel and no channel was specified. You can also use the `users` parameter to manually specify users.',
            );
            return;
          }
        }

        if (voiceChannel.type !== 2) {
          await interaction.editReply('The specified channel is not a voice channel.');
          return;
        }

        let members = new Map<string, GuildMember>();
        for (const [id, m] of voiceChannel.members) {
          if (!m.user.bot) {
            members.set(id, m);
          }
        }

        if (blacklistString) {
          const result = applyBlacklist(members, blacklistString);
          members = result.filteredMembers;
          blacklistedUsers = result.blacklistedUsers;
        }

        if (members.size === 0) {
          const blacklistNote = blacklistString ? ' (after applying blacklist)' : '';
          await interaction.editReply(`No users found in ${voiceChannel.name}${blacklistNote}.`);
          return;
        }

        if (members.size === 1) {
          const blacklistNote = blacklistString ? ' (after applying blacklist)' : '';
          await interaction.editReply(`Only one user found in ${voiceChannel.name}${blacklistNote}. Need at least 2 users to find shared games.`);
          return;
        }

        for (const [, member] of members) {
          const sid = await mapDiscordToSteam(member.user.id, userMappings);
          if (sid) {
            steamIds.push(sid);
            userDisplayNames.set(sid, member.displayName);
          }
        }

        searchContext = voiceChannel.name;
      }

      if (steamIds.length === 0) {
        await interaction.editReply('No Steam accounts found for the specified users.');
        return;
      }

      if (steamIds.length === 1) {
        await interaction.editReply('Only one Steam account found for the specified users. Need at least 2 to find shared games.');
        return;
      }

      const gamesResponse = await fetch(`${env.API_URL_INTERNAL}/api/Games`);
      if (!gamesResponse.ok) {
        throw new Error('Failed to fetch games from database');
      }
      const allGames = await gamesResponse.json() as Record<string, unknown>[];

      const sharedGames = allGames.filter((game) => {
        const gameOwners: string[] = ((game.ownedBy as { steamId?: string[] })?.steamId) ?? [];
        return steamIds.every((sid) => gameOwners.includes(sid));
      });

      if (sharedGames.length === 0) {
        const userList = [...userDisplayNames.values()].join(', ');
        await interaction.editReply(`No shared games found for: ${userList}`);
        return;
      }

      sharedGames.sort((a, b) => {
        const scoreA = (a.metacritic as { score?: number })?.score ?? 0;
        const scoreB = (b.metacritic as { score?: number })?.score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.name as string).localeCompare(b.name as string);
      });

      const displayGames = sharedGames.slice(0, limit);
      const userList = [...userDisplayNames.values()].join(', ');

      const gamesList = displayGames
        .map((game, i) => {
          const price = (game.priceOverview as { finalFormatted?: string })?.finalFormatted ??
            ((game.isFree as boolean) ? 'Free' : 'N/A');
          const metacritic = (game.metacritic as { score?: number })?.score
            ? ` (${(game.metacritic as { score: number }).score}/100)`
            : '';
          return `${i + 1}. **${game.name}**${metacritic} - ${price}`;
        })
        .join('\n');

      let description = `🎮 Found ${sharedGames.length} games owned by all users!\n\n**👥 Users:** ${userList}`;

      if (blacklistedUsers.length > 0) {
        description += `\n\n**🚫 Blacklisted:** ${blacklistedUsers.join(', ')}`;
      }

      description += `\n\n**🎯 Games:**\n${gamesList}`;

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Shared Games: ${searchContext}`)
        .setDescription(description)
        .setColor(0x00ff00)
        .setFooter({ text: `Showing ${displayGames.length} of ${sharedGames.length} games • Powered by NerdHub` })
        .setTimestamp();

      if (sharedGames.length > limit) {
        embed.addFields({
          name: '📝 Note',
          value: `Only showing first ${limit} games. Use the \`limit\` parameter to see more (max 25).`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ error }, 'Error in sharedgame command');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('An error occurred while finding shared games.');
      }
    }
  },
};

export default command;
