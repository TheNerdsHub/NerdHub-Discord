const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sharedgame')
        .setDescription('Find games owned by all users in a voice channel.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The voice channel to check (defaults to your current voice channel)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Maximum number of games to show (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25))
        .addStringOption(option =>
            option.setName('blacklist')
                .setDescription('Comma-separated list of users to exclude from voice channel search')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('users')
                .setDescription('Comma-separated list of users to check (by nickname, username, or Steam ID)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        const specifiedChannel = interaction.options.getChannel('channel');
        const limit = interaction.options.getInteger('limit') || 10;
        const blacklistString = interaction.options.getString('blacklist');
        const usersString = interaction.options.getString('users');

        try {
            // Fetch user mappings early as we'll need them for all scenarios
            const userMappingsResponse = await fetch(`${process.env.BACKEND_URL}/api/Games/get-all-usernames`);
            if (!userMappingsResponse.ok) {
                throw new Error('Failed to fetch user mappings');
            }
            const userMappings = await userMappingsResponse.json();

            let steamIds = [];
            let userDisplayNames = new Map();
            let searchContext = '';
            let blacklistedUsers = [];

            // Fourth Behavior: Manual list of users
            if (usersString) {
                const result = await parseUserList(usersString, userMappings);
                steamIds = result.steamIds;
                userDisplayNames = result.userDisplayNames;
                searchContext = 'manual user list';
                
                // Provide feedback about users not found
                if (result.notFound.length > 0) {
                    const notFoundList = result.notFound.join(', ');
                    await interaction.followUp({ 
                        content: `⚠️ **Warning:** Could not find Steam accounts for: ${notFoundList}. Make sure they've used \`/link-steam\` to register.`,
                        ephemeral: true 
                    });
                }
            } else {
                // First, Second, and Third Behaviors: Voice channel based
                let voiceChannel = specifiedChannel;

                // If no channel specified, find the user's current voice channel
                if (!voiceChannel) {
                    const member = interaction.member;
                    if (!member.voice.channel) {
                        await interaction.editReply('You are not in a voice channel and no channel was specified. You can also use the `users` parameter to manually specify users.');
                        return;
                    }
                    voiceChannel = member.voice.channel;
                }

                // Check if the specified channel is a voice channel
                if (voiceChannel.type !== 2) { // 2 = GUILD_VOICE
                    await interaction.editReply('The specified channel is not a voice channel.');
                    return;
                }

                // Get all members in the voice channel (excluding bots)
                let members = voiceChannel.members.filter(member => !member.user.bot);

                // Third Behavior: Apply blacklist filtering
                if (blacklistString) {
                    const blacklistResult = applyBlacklist(members, blacklistString);
                    members = blacklistResult.filteredMembers;
                    blacklistedUsers = blacklistResult.blacklistedUsers;
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

                // Map Discord users to Steam IDs using the UserMapping service
                for (const [_, member] of members) {
                    const steamId = await mapDiscordToSteam(member.user.id, userMappings);
                    if (steamId) {
                        steamIds.push(steamId);
                        userDisplayNames.set(steamId, member.displayName);
                    }
                }

                searchContext = voiceChannel.name;
            }

            if (steamIds.length === 0) {
                await interaction.editReply(`No Steam accounts found for the specified users.`);
                return;
            }

            if (steamIds.length === 1) {
                await interaction.editReply(`Only one Steam account found for the specified users. Need at least 2 to find shared games.`);
                return;
            }

            // Fetch all games
            const gamesResponse = await fetch(`${process.env.BACKEND_URL}/api/Games`);
            if (!gamesResponse.ok) {
                throw new Error('Failed to fetch games from database');
            }
            const allGames = await gamesResponse.json();

            // Find games owned by ALL users in the voice channel
            const sharedGames = allGames.filter(game => {
                const gameOwners = game.ownedBy?.steamId || [];
                return steamIds.every(steamId => gameOwners.includes(steamId));
            });

            if (sharedGames.length === 0) {
                const userList = Array.from(userDisplayNames.values()).join(', ');
                await interaction.editReply(`No shared games found for: ${userList}`);
                return;
            }

            // Sort by metacritic score if available, then by name
            sharedGames.sort((a, b) => {
                const scoreA = a.metacritic?.score || 0;
                const scoreB = b.metacritic?.score || 0;
                if (scoreA !== scoreB) {
                    return scoreB - scoreA; // Higher score first
                }
                return a.name.localeCompare(b.name);
            });

            const displayGames = sharedGames.slice(0, limit);
            const userList = Array.from(userDisplayNames.values()).join(', ');

            const gamesList = displayGames.map((game, index) => {
                const price = game.priceOverview?.finalFormatted || (game.isFree ? "Free" : "N/A");
                const metacritic = game.metacritic?.score ? ` (${game.metacritic.score}/100)` : '';
                return `${index + 1}. **${game.name}**${metacritic} - ${price}`;
            }).join('\n');

            // Build description with blacklisted users if any
            let description = `Found ${sharedGames.length} games owned by all users!\n\n**Users:** ${userList}`;
            
            if (blacklistedUsers.length > 0) {
                const blacklistedList = blacklistedUsers.join(', ');
                description += `\n**🚫 Blacklisted:** ${blacklistedList}`;
            }
            
            description += `\n\n**Games:**\n${gamesList}`;

            const titleContext = usersString ? 'Manual Selection' : searchContext;
            const embed = new EmbedBuilder()
                .setTitle(`🎮 Shared Games: ${titleContext}`)
                .setDescription(description)
                .setColor('#00ff00')
                .setFooter({ text: `Showing ${displayGames.length} of ${sharedGames.length} games • Powered by NerdHub` })
                .setTimestamp();

            if (sharedGames.length > limit) {
                embed.addFields({
                    name: '📝 Note',
                    value: `Only showing first ${limit} games. Use the \`limit\` parameter to see more (max 25).`
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in sharedgame command:', error);
            await interaction.editReply('An error occurred while finding shared games.');
        }
    },
};

// Helper function to map Discord user ID to Steam ID
async function mapDiscordToSteam(discordId, userMappings) {
    // Find user mapping by Discord ID in the userMappings array
    const mapping = userMappings.find(user => user.discordId === discordId);
    return mapping ? mapping.steamId : null;
}

// Helper function to parse manual user list and find Steam IDs
async function parseUserList(usersString, userMappings) {
    const userEntries = usersString.split(',').map(entry => entry.trim()).filter(entry => entry.length > 0);
    const steamIds = [];
    const userDisplayNames = new Map();
    const notFound = [];

    for (const userEntry of userEntries) {
        // Try to find user by Steam ID, username, or nickname
        let mapping = null;
        
        // Check if it's a Steam ID (17 digits)
        if (/^\d{17}$/.test(userEntry)) {
            mapping = userMappings.find(user => user.steamId === userEntry);
        } else {
            // Search by username or nickname (case-insensitive)
            mapping = userMappings.find(user => 
                user.username.toLowerCase() === userEntry.toLowerCase() ||
                (user.nickname && user.nickname.toLowerCase() === userEntry.toLowerCase())
            );
        }

        if (mapping) {
            steamIds.push(mapping.steamId);
            userDisplayNames.set(mapping.steamId, mapping.nickname || mapping.username);
        } else {
            notFound.push(userEntry);
        }
    }

    return { steamIds, userDisplayNames, notFound };
}

// Helper function to apply blacklist filtering to Discord members
function applyBlacklist(members, blacklistString) {
    const blacklistEntries = blacklistString.split(',').map(entry => entry.trim().toLowerCase()).filter(entry => entry.length > 0);
    const filteredMembers = new Map();
    const blacklistedUsers = [];
    
    for (const [memberId, member] of members) {
        const displayName = member.displayName.toLowerCase();
        const username = member.user.username.toLowerCase();
        const globalName = member.user.globalName?.toLowerCase() || '';
        
        // Check if any blacklist entry matches display name, username, or global name
        const isBlacklisted = blacklistEntries.some(blacklistEntry => 
            displayName.includes(blacklistEntry) ||
            username.includes(blacklistEntry) ||
            globalName.includes(blacklistEntry)
        );
        
        if (isBlacklisted) {
            blacklistedUsers.push(member.displayName);
        } else {
            filteredMembers.set(memberId, member);
        }
    }
    
    return { filteredMembers, blacklistedUsers };
}
