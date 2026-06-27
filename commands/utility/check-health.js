const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-health')
        .setDescription('Check the connection status between the Discord bot and NerdHub backend.'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const startTime = Date.now();
            
            // Test connection to backend health endpoint
            const response = await fetch(`${process.env.API_URL_INTERNAL}/api/Version/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000 // 5 second timeout
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (response.ok) {
                const healthData = await response.json();
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Connection Status: Healthy')
                    .setDescription('Successfully connected to NerdHub backend!')
                    .addFields(
                        { name: '🌐 Backend URL', value: process.env.API_URL_INTERNAL, inline: true },
                        { name: '⏱️ Response Time', value: `${responseTime}ms`, inline: true },
                        { name: '📊 Status Code', value: response.status.toString(), inline: true },
                        { name: '🕐 Backend Timestamp', value: new Date(healthData.timestamp).toLocaleString(), inline: true },
                        { name: '🔧 Service', value: healthData.service, inline: true },
                        { name: '📋 Version', value: healthData.version || 'Unknown', inline: true },
                        { name: '💚 Status', value: healthData.status, inline: false }
                    )
                    .setColor('#00ff00')
                    .setFooter({ text: 'NerdHub Discord Bot' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Backend connection error:', error);
            
            let errorMessage = 'Unknown error occurred';
            let statusCode = 'Unknown';
            
            if (error.message.includes('fetch')) {
                errorMessage = 'Network connection failed';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Connection timeout (>5s)';
            } else if (error.message.includes('HTTP')) {
                errorMessage = error.message;
                statusCode = error.message.split(' ')[1];
            } else {
                errorMessage = error.message;
            }

            const embed = new EmbedBuilder()
                .setTitle('❌ Connection Status: Unhealthy')
                .setDescription('Failed to connect to NerdHub backend!')
                .addFields(
                    { name: '🌐 Backend URL', value: process.env.API_URL_INTERNAL || 'Not configured', inline: true },
                    { name: '📊 Status Code', value: statusCode, inline: true },
                    { name: '❗ Error', value: errorMessage, inline: false },
                    { name: '🔧 Troubleshooting', value: '• Check if backend is running\n• Verify BACKEND_URL in .env\n• Check network connectivity', inline: false }
                )
                .setColor('#ff0000')
                .setFooter({ text: 'NerdHub Discord Bot' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },
};