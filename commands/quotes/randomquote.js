const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('randomquote')
		.setDescription('Replies with a random quote from the database.'),
	async execute(interaction) {
		await interaction.reply('Not implemented yet.');
	},
};