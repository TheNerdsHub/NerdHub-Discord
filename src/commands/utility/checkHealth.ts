import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types.js';
import { env } from '../../config.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('check-health')
    .setDescription('Check the connection status between the Discord bot and NerdHub backend.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const startTime = Date.now();

    try {
      const response = await fetch(`${env.API_URL_INTERNAL}/api/Version/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const healthData = await response.json() as {
          timestamp: string;
          service: string;
          version?: string;
          status: string;
        };

        const embed = new EmbedBuilder()
          .setTitle('\u2705 Connection Status: Healthy')
          .setColor(0x00ff00)
          .setDescription('Successfully connected to NerdHub backend!')
          .addFields(
            { name: '🌐 Backend URL', value: env.API_URL_INTERNAL, inline: true },
            { name: '⏱️ Response Time', value: `${responseTime}ms`, inline: true },
            { name: '📊 Status Code', value: response.status.toString(), inline: true },
            { name: '🕐 Backend Timestamp', value: new Date(healthData.timestamp).toLocaleString(), inline: true },
            { name: '🔧 Service', value: healthData.service, inline: true },
            { name: '📋 Version', value: healthData.version ?? 'Unknown', inline: true },
            { name: '💚 Status', value: healthData.status },
          )
          .setFooter({ text: 'NerdHub Discord Bot' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let errorMessage = 'Unknown error occurred';
      let statusCode = 'Unknown';

      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('fetch')) {
        errorMessage = 'Network connection failed';
      } else if (message.includes('timeout')) {
        errorMessage = 'Connection timeout (>5s)';
      } else if (message.includes('HTTP')) {
        errorMessage = message;
        statusCode = message.split(' ')[1] ?? 'Unknown';
      } else {
        errorMessage = message;
      }

      const embed = new EmbedBuilder()
        .setTitle('\u274C Connection Status: Unhealthy')
        .setColor(0xff0000)
        .setDescription('Failed to connect to NerdHub backend!')
        .addFields(
          { name: '🌐 Backend URL', value: env.API_URL_INTERNAL, inline: true },
          { name: '📊 Status Code', value: statusCode, inline: true },
          { name: '⏱️ Response Time', value: `${responseTime}ms`, inline: true },
          { name: '❗ Error', value: errorMessage },
          {
            name: '🔧 Troubleshooting',
            value: 'Check if backend is running\nVerify API_URL_INTERNAL in .env\nCheck network connectivity',
          },
        )
        .setFooter({ text: 'NerdHub Discord Bot' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
