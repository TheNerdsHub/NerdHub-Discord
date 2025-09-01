const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote-of-the-day')
        .setDescription('Get the quote of the day.'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/Quotes/daily`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    await interaction.editReply('No quotes found in the database.');
                    return;
                }
                throw new Error(`Failed to fetch quote: ${response.statusText}`);
            }
            
            const quote = await response.json();
            
            const embed = new EmbedBuilder()
                .setTitle('📅 Quote of the Day')
                .setDescription(`"${quote.quoteText}"`)
                .addFields(
                    { name: '🗣️ Quoted Person(s)', value: quote.quotedPersons.join(', '), inline: true },
                    { name: '📝 Submitted by', value: quote.submitter, inline: true },
                    { name: '📅 Date', value: new Date(quote.timestamp).toLocaleDateString(), inline: true }
                )
                .setColor('#ffd700')
                .setFooter({ text: 'NerdHub Quotes • Same quote all day!' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching quote of the day:', error);
            await interaction.editReply('An error occurred while fetching the quote of the day.');
        }
    },
};
