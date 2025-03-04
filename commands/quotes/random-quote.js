const { SlashCommandBuilder } = require('discord.js');
const Quote = require('../../models/Quote');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addquote')
        .setDescription('Adds a new quote')
        .addStringOption(option => 
            option.setName('quote')
                .setDescription('The quote to add')
                .setRequired(true)),
    async execute(interaction) {
        const quoteText = interaction.options.getString('quote');
        const quote = new Quote({ text: quoteText });

        try {
            await quote.save();
            await interaction.reply('Quote added successfully!');
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error adding the quote.');
        }
    },
};