const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomgame')
        .setDescription('Fetches a random game from the database.')
        .addStringOption(option =>
            option.setName('genre')
                .setDescription('Filter by game genre')
                .setRequired(false)
                .addChoices(
                    { name: 'Action', value: 'action' },
                    { name: 'Adventure', value: 'adventure' },
                    { name: 'RPG', value: 'rpg' },
                    { name: 'Strategy', value: 'strategy' },
                ))
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Filter by game platform')
                .setRequired(false)
                .addChoices(
                    { name: 'Windows', value: 'windows' },
                    { name: 'Mac', value: 'mac' },
                    { name: 'Linux', value: 'linux' },
                )),
    async execute(interaction) {
        await interaction.deferReply();

        const genre = interaction.options.getString('genre');
        const platform = interaction.options.getString('platform');

        // Build the query parameters based on the provided options
        const queryParams = new URLSearchParams();
        if (genre) queryParams.append('genre', genre);
        if (platform) queryParams.append('platform', platform);

        try {
            // Fetch all games from the backend
            const response = await fetch(`${process.env.BACKEND_URL}/api/games?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch games: ${response.statusText}`);
            }

            const games = await response.json();
            if (games.length === 0) {
                await interaction.editReply('No games found with the specified filters.');
                return;
            }

            // Pick a random game
            const randomGame = games[Math.floor(Math.random() * games.length)];

            // Fetch usernames for the ownedBy.steamId field
            const steamIds = randomGame.ownedBy?.steamId || [];
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

            // Extract relevant details
            const appId = randomGame.appid;
            const platforms = Object.keys(randomGame.platforms)
                .filter(key => randomGame.platforms[key])
                .map(platform => platform.charAt(0).toUpperCase() + platform.slice(1)); // Capitalize the first letter
            const genreDescriptions = randomGame.genres?.map(genre => genre.description).join(', ') || "Unknown";

            // Format the ownedBy field with usernames
            const ownedByDetails = steamIds.map(id => `${id} - ${usernames[id]?.nickname || usernames[id]?.username || "Unknown User"}`).join('\n') || "Unknown";

            // Create an embed for the random game details
            const embed = new EmbedBuilder()
                .setTitle(`🎮 ${randomGame.name}`)
                .setURL(`https://store.steampowered.com/app/${randomGame.appid}`)
                .setDescription(randomGame.shortDescription || "No description available.")
                .addFields(
                    { name: 'Price', value: randomGame.priceOverview?.finalFormatted || (randomGame.isFree ? "Free" : "N/A"), inline: true },
                    { name: 'App ID', value: appId.toString(), inline: true },
                    { name: 'Platforms', value: platforms.join(', ') || "Unknown", inline: true },
                    { name: 'Genres', value: genreDescriptions, inline: true },
                    { name: 'Owned By', value: ownedByDetails, inline: false },
                )
                .setColor('#0099ff') // Set a color for the embed
                .setFooter({ text: 'Powered by NerdHub' })
                .setTimestamp()
                .setImage(randomGame.headerImage);

            // Reply with the embed
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while fetching a random game.');
        }
    },
};