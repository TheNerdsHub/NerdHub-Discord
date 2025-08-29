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
                .setMaxValue(25)),
    async execute(interaction) {
        await interaction.deferReply();

        const specifiedChannel = interaction.options.getChannel('channel');
        const limit = interaction.options.getInteger('limit') || 10;

        try {
            let voiceChannel = specifiedChannel;

            // If no channel specified, find the user's current voice channel
            if (!voiceChannel) {
                const member = interaction.member;
                if (!member.voice.channel) {
                    await interaction.editReply('You are not in a voice channel and no channel was specified.');
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
            const members = voiceChannel.members.filter(member => !member.user.bot);
            
            if (members.size === 0) {
                await interaction.editReply(`No users found in ${voiceChannel.name}.`);
                return;
            }

            if (members.size === 1) {
                await interaction.editReply(`Only one user found in ${voiceChannel.name}. Need at least 2 users to find shared games.`);
                return;
            }

            const userMappingsResponse = await fetch(`${process.env.BACKEND_URL}/api/Games/get-all-usernames`);
            if (!userMappingsResponse.ok) {
                throw new Error('Failed to fetch user mappings');
            }
            const userMappings = await userMappingsResponse.json();

            // Map Discord users to Steam IDs using the UserMapping service
            const steamIds = [];
            const discordToSteamMap = new Map();
            
            for (const [_, member] of members) {
                const steamId = await mapDiscordToSteam(member.user.id, userMappings);
                if (steamId) {
                    steamIds.push(steamId);
                    discordToSteamMap.set(steamId, member.displayName);
                }
            }

            if (steamIds.length === 0) {
                await interaction.editReply(`No Steam accounts found for users in ${voiceChannel.name}.`);
                return;
            }

            if (steamIds.length === 1) {
                await interaction.editReply(`Only one Steam account found for users in ${voiceChannel.name}. Need at least 2 to find shared games.`);
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
                const userList = Array.from(discordToSteamMap.values()).join(', ');
                await interaction.editReply(`No shared games found for all users in ${voiceChannel.name}: ${userList}`);
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
            const userList = Array.from(discordToSteamMap.values()).join(', ');

            const gamesList = displayGames.map((game, index) => {
                const price = game.priceOverview?.finalFormatted || (game.isFree ? "Free" : "N/A");
                const metacritic = game.metacritic?.score ? ` (${game.metacritic.score}/100)` : '';
                return `${index + 1}. **${game.name}**${metacritic} - ${price}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`🎮 Shared Games in ${voiceChannel.name}`)
                .setDescription(`Found ${sharedGames.length} games owned by all users!\n\n**Users:** ${userList}\n\n**Games:**\n${gamesList}`)
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
