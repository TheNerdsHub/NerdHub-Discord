const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote-status')
        .setDescription('Check the current quote monitoring configuration.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/QuoteCategories/guild/${interaction.guildId}`);
            
            if (response.ok) {
                const config = await response.json();
                const isCategory = !config.categoryName.startsWith('#');
                
                let description;
                if (isCategory) {
                    // Category mode
                    const category = interaction.guild.channels.cache.get(config.categoryId);
                    if (category) {
                        const textChannels = category.children.cache.filter(ch => ch.type === 0);
                        const channelList = textChannels.size > 0 ? 
                            `\n\n**Monitoring channels:**\n${textChannels.map(ch => `• #${ch.name}`).join('\n')}` : 
                            '\n\n*No text channels found in this category.*';
                        
                        description = `📁 **Category Mode**\nMonitoring all text channels in **${category.name}**${channelList}`;
                    } else {
                        description = `❌ **Category Not Found**\nThe configured category (ID: ${config.categoryId}) no longer exists.`;
                    }
                } else {
                    // Single channel mode
                    const channel = interaction.guild.channels.cache.get(config.categoryId);
                    if (channel) {
                        description = `📝 **Single Channel Mode**\nMonitoring quotes in ${channel}`;
                    } else {
                        description = `❌ **Channel Not Found**\nThe configured channel (ID: ${config.categoryId}) no longer exists.`;
                    }
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Quote Monitoring Status')
                    .setDescription(description)
                    .setColor('#0099ff')
                    .setFooter({ text: `Last updated: ${new Date(config.updatedAt).toLocaleString()}` });
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('📊 Quote Monitoring Status')
                    .setDescription('❌ **No Configuration Found**\n\nQuote monitoring is not currently set up. Use `/set-quote-channel` to configure it.')
                    .setColor('#ff9900');
                
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error checking quote status:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to check quote monitoring status. Please try again.')
                .setColor('#ff0000');
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
