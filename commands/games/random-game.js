const { SlashCommandBuilder } = require('@discordjs/builders');
const { Interaction } = require('discord.js');
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
        await interaction.deferReply(); // Defer the reply to allow time for processing

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

            // Extract relevant details
            const appId = randomGame.appid;
            const platforms = Object.keys(randomGame.platforms).filter(key => randomGame.platforms[key]);
            const genreDescription = randomGame.genres.find(genre => genre.genreId === "1")?.description || "Unknown";

            // Reply with the random game details
            await interaction.editReply(
                `🎮 Random Game: **${randomGame.name}**\n` +
                `App ID: ${appId}\n` +
                `Platforms: ${platforms.join(', ')}\n` +
                `Genre: ${genreDescription}\n` +
                `Description: ${randomGame.shortDescription}`
            );
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while fetching a random game.');
        }
    },
};