const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('databasestats')
		.setDescription('Responds with the statisiics of the database connection.'),
	async execute(interaction) {
		await interaction.reply('Not implemented yet.');
	},
};