const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-quote-channel')
        .setDescription('Set a single channel or category to monitor for quotes.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Text channel or category to monitor for quotes')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const channel = interaction.options.getChannel('channel');
        
        // Check if it's a text channel (single channel mode) or category (category mode)
        if (channel.type !== 0 && channel.type !== 4) { // 0 = GUILD_TEXT, 4 = GUILD_CATEGORY
            await interaction.editReply('Please select either a text channel or a category.');
            return;
        }
        
        try {
            if (channel.type === 4) { // Category
                // Store category in database
                const categoryData = {
                    guildId: interaction.guildId,
                    categoryId: channel.id,
                    categoryName: channel.name
                };
                
                const response = await fetch(`${process.env.BACKEND_URL}/api/QuoteCategories`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(categoryData),
                });
                
                if (response.ok) {
                    const textChannels = channel.children.cache.filter(ch => ch.type === 0);
                    const channelList = textChannels.size > 0 ? 
                        `\n\n**Monitoring channels:**\n${textChannels.map(ch => `• #${ch.name}`).join('\n')}` : 
                        '\n\n*No text channels found in this category.*';
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Quote Category Set')
                        .setDescription(`Quote monitoring is now active in all text channels within **${channel.name}**${channelList}`)
                        .setColor('#00ff00');
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    throw new Error(`Failed to save category: ${response.statusText}`);
                }
                
            } else { // Text Channel (type 0)
                // Store single channel as a "category" with the channel as both category and target
                const singleChannelData = {
                    guildId: interaction.guildId,
                    categoryId: channel.id, // Use the channel ID as category ID for single channel mode
                    categoryName: `#${channel.name}` // Prefix with # to indicate it's a single channel
                };
                
                const response = await fetch(`${process.env.BACKEND_URL}/api/QuoteCategories`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(singleChannelData),
                });
                
                if (response.ok) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Quote Channel Set')
                        .setDescription(`Quote monitoring is now active in ${channel}`)
                        .setColor('#00ff00');
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    throw new Error(`Failed to save channel: ${response.statusText}`);
                }
            }
            
        } catch (error) {
            console.error('Error setting quote channel/category:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to set quote monitoring. Please try again.')
                .setColor('#ff0000');
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
