const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('randomgame')
		.setDescription('Replies with a random game from the database.'),
	async execute(interaction) {
		await interaction.reply('Not implemented yet.');
	},
};