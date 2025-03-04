const { SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbstatus')
        .setDescription('Shows the current database connection status'),
    async execute(interaction) {
        let statusMessage;
        switch (mongoose.connection.readyState) {
            case 0:
                statusMessage = 'Disconnected';
                break;
            case 1:
                statusMessage = 'Connected';
                break;
            case 2:
                statusMessage = 'Connecting';
                break;
            case 3:
                statusMessage = 'Disconnecting';
                break;
            default:
                statusMessage = 'Unknown';
                break;
        }

        await interaction.reply(`Current database connection status: ${statusMessage}`);
    },
};