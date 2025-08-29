const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getgame')
        .setDescription('Fetches a specific game from the database by App ID or name.')
        .addIntegerOption(option =>
            option.setName('appid')
                .setDescription('The App ID of the game to fetch')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the game to search for')
                .setRequired(false)),
        async execute(interaction) {
        await interaction.deferReply();

        const appid = interaction.options.getInteger('appid');
        const gameName = interaction.options.getString('name');

        // Validate that at least one search parameter is provided
        if (!appid && !gameName) {
            await interaction.editReply('Please provide either an App ID or a game name to search for.');
            return;
        }

        try {
            let game = null;

            if (appid) {
                // Search by App ID - direct API call
                const response = await fetch(`${process.env.BACKEND_URL}/api/Games/${appid}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch game: ${response.statusText}`);
                }
                game = await response.json();
                
                if (!game) {
                    await interaction.editReply(`No game found with App ID ${appid}.`);
                    return;
                }
            } else {
                // Search by name - fetch all games and search
                const response = await fetch(`${process.env.BACKEND_URL}/api/Games`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch games: ${response.statusText}`);
                }
                
                const allGames = await response.json();
                
                // Find exact match first, then partial matches
                const exactMatches = allGames.filter(g => 
                    g.name.toLowerCase() === gameName.toLowerCase()
                );
                
                if (exactMatches.length > 0) {
                    game = exactMatches[0];
                } else {
                    // Look for partial matches
                    const partialMatches = allGames.filter(g => 
                        g.name.toLowerCase().includes(gameName.toLowerCase())
                    );
                    
                    if (partialMatches.length === 0) {
                        await interaction.editReply(`No games found matching "${gameName}".`);
                        return;
                    } else if (partialMatches.length === 1) {
                        game = partialMatches[0];
                    } else {
                        // Multiple matches - show options
                        const matchList = partialMatches
                            .slice(0, 10) // Limit to first 10 matches
                            .map((g, index) => `${index + 1}. **${g.name}** (ID: ${g.appid})`)
                            .join('\n');
                        
                        const embed = new EmbedBuilder()
                            .setTitle(`🔍 Multiple games found for "${gameName}"`)
                            .setDescription(`Found ${partialMatches.length} games. Showing first 10:\n\n${matchList}`)
                            .setColor('#FFA500')
                            .setFooter({ text: 'Use /getgame with the specific App ID to get details for a specific game.' });
                        
                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                }
            }

            const steamIds = game.ownedBy?.steamId || [];
            let usernames = {};
            if (steamIds.length > 0) {
                const usernamesResponse = await fetch(`${process.env.BACKEND_URL}/api/Games/get-usernames`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(steamIds),
                });

                if (usernamesResponse.ok) {
                    usernames = await usernamesResponse.json();
                } else {
                    console.warn('Failed to fetch usernames:', await usernamesResponse.text());
                }
            }

            const platforms = Object.keys(game.platforms)
                .filter(key => game.platforms[key])
                .map(platform => platform.charAt(0).toUpperCase() + platform.slice(1)); // Capitalize the first letter
            const genreDescriptions = game.genres?.map(genre => genre.description).join(', ') || "Unknown";

            const ownedByDetails = steamIds
                .map(id => usernames[id]?.nickname || usernames[id]?.username || "Unknown User")
                .sort((a, b) => a.localeCompare(b))
                .join(', ') || "Unknown";

            // Get additional details for the embed
            const releaseDate = game.releaseDate?.date || "Unknown";
            const metacriticScore = game.metacritic?.score ? `${game.metacritic.score}/100` : "N/A";
            const developerInfo = game.developers?.join(', ') || "Unknown";
            const publisherInfo = game.publishers?.join(', ') || "Unknown";
            const categories = game.categories?.slice(0, 5).map(cat => cat.description).join(', ') || "None";

            const embed = new EmbedBuilder()
                .setTitle(`🎮 ${game.name}`)
                .setURL(`https://store.steampowered.com/app/${game.appid}`)
                .setDescription(game.shortDescription || "No description available.")
                .addFields(
                    { name: '💰 Price', value: game.priceOverview?.finalFormatted || (game.isFree ? "Free" : "N/A"), inline: true },
                    { name: '🔢 App ID', value: game.appid.toString(), inline: true },
                    { name: '🖥️ Platforms', value: platforms.join(', ') || "Unknown", inline: true },
                    { name: '🎯 Genres', value: genreDescriptions, inline: true },
                    { name: '📅 Release Date', value: releaseDate, inline: true },
                    { name: '⭐ Metacritic', value: metacriticScore, inline: true },
                    { name: '🏗️ Developer', value: developerInfo.length > 50 ? developerInfo.substring(0, 47) + '...' : developerInfo, inline: true },
                    { name: '📢 Publisher', value: publisherInfo.length > 50 ? publisherInfo.substring(0, 47) + '...' : publisherInfo, inline: true },
                    { name: '📂 Categories', value: categories.length > 50 ? categories.substring(0, 47) + '...' : categories, inline: true },
                    { name: '👥 Owned By', value: ownedByDetails.length > 1024 ? ownedByDetails.substring(0, 1021) + '...' : ownedByDetails, inline: false },
                )
                .setColor('#0099ff')
                .setFooter({ text: 'Powered by NerdHub' })
                .setTimestamp()
                .setImage(game.headerImage);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while fetching the game.');
        }
    },
};