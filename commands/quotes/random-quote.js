const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random-quote')
        .setDescription('Get a random quote from the collection.'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const response = await fetch(`${process.env.API_URL_INTERNAL}/api/Quotes/random`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    await interaction.editReply('No quotes found in the database.');
                    return;
                }
                throw new Error(`Failed to fetch quote: ${response.statusText}`);
            }
            
            const quote = await response.json();
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 Random Quote')
                .setDescription(`"${quote.quoteText}"`)
                .addFields(
                    { name: '🗣️ Quoted Person(s)', value: quote.quotedPersons.join(', '), inline: true },
                    { name: '📝 Submitted by', value: quote.submitter, inline: true },
                    { name: '📅 Date', value: new Date(quote.timestamp).toLocaleDateString(), inline: true }
                )
                .setColor('#0099ff')
                .setFooter({ text: 'NerdHub Quotes' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching random quote:', error);
            await interaction.editReply('An error occurred while fetching a random quote.');
        }
    },
};
