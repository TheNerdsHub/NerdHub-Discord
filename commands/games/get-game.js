const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getgame')
        .setDescription('Fetches a specific game from the database by App ID.')
        .addIntegerOption(option =>
            option.setName('appid')
                .setDescription('The App ID of the game to fetch')
                .setRequired(true)),
        async execute(interaction) {
        await interaction.deferReply();

        const appid = interaction.options.getInteger('appid');

        try {
            // Fetch the game details from the backend
            const response = await fetch(`${process.env.BACKEND_URL}/api/Games/${appid}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch game: ${response.statusText}`);
            }

            const game = await response.json();
            if (!game) {
                await interaction.editReply(`No game found with App ID ${appid}.`);
                return;
            }

            // Fetch usernames for the ownedBy.steamId field
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

            // Extract relevant details
            const platforms = Object.keys(game.platforms)
                .filter(key => game.platforms[key])
                .map(platform => platform.charAt(0).toUpperCase() + platform.slice(1)); // Capitalize the first letter
            const genreDescriptions = game.genres?.map(genre => genre.description).join(', ') || "Unknown";

            // Format the ownedBy field with usernames
            const ownedByDetails = steamIds.map(id => `${usernames[id]?.nickname || usernames[id]?.username || "Unknown User"}`).join(', ') || "Unknown";

            // Create an embed for the game details
            const embed = new EmbedBuilder()
                .setTitle(`🎮 ${game.name}`)
                .setURL(`https://store.steampowered.com/app/${game.appid}`)
                .setDescription(game.shortDescription || "No description available.")
                .addFields(
                    { name: 'Price', value: game.priceOverview?.finalFormatted || (game.isFree ? "Free" : "N/A"), inline: true },
                    { name: 'App ID', value: appid.toString(), inline: true },
                    { name: 'Platforms', value: platforms.join(', ') || "Unknown", inline: true },
                    { name: 'Genres', value: genreDescriptions, inline: true },
                    { name: 'Owned By', value: ownedByDetails, inline: false },
                )
                .setColor('#0099ff') // Set a color for the embed
                .setFooter({ text: 'Powered by NerdHub' })
                .setTimestamp()
                .setImage(game.headerImage);

            // Reply with the embed
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while fetching the game.');
        }
    },
};