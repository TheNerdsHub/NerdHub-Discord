const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link-steam')
        .setDescription('Link your Discord account to your Steam ID.')
        .addStringOption(option =>
            option.setName('steamid')
                .setDescription('Your Steam ID (17-digit number)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Steam username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('Your Actual Name')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const steamId = interaction.options.getString('steamid');
        const username = interaction.options.getString('username');
        const nickname = interaction.options.getString('nickname') || username;
        const discordId = interaction.user.id;

        // Validate Steam ID format (basic check for 17-digit number)
        if (!/^\d{17}$/.test(steamId)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid Steam ID')
                .setDescription('Please provide a valid 17-digit Steam ID.\n\n**How to find your Steam ID:**\n1. Go to your Steam profile\n2. Right-click and select "Copy Page URL"\n3. Your Steam ID is the 17-digit number at the end of the URL')
                .setColor('#ff0000');
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Validate username (basic check)
        if (username.length < 3 || username.length > 32) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid Username')
                .setDescription('Steam username must be between 3 and 32 characters long.')
                .setColor('#ff0000');
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/Games/add-or-update-user-mapping`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    steamId: steamId,
                    username: username,
                    nickname: nickname,
                    discordId: discordId
                }),
            });

            if (response.ok) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Account Linked Successfully!')
                    .setDescription(`Your Discord account has been linked to Steam ID: **${steamId}**`)
                    .addFields(
                        { name: '👤 Steam Username', value: username, inline: true },
                        { name: '🏷️ Display Name', value: nickname, inline: true },
                        { name: '🆔 Discord ID', value: discordId, inline: true }
                    )
                    .setColor('#00ff00')
                    .setFooter({ text: 'You can now use commands like /sharedgame!' });
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                const errorText = await response.text();
                console.error('Failed to link Steam account:', errorText);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ Failed to Link Account')
                    .setDescription(`An error occurred while linking your accounts.\n\n**Error:** ${errorText}`)
                    .setColor('#ff0000');
                
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error linking Steam account:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Connection Error')
                .setDescription('Unable to connect to the NerdHub backend. Please try again later.')
                .setColor('#ff0000');
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
