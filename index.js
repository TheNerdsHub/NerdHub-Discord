// Imports
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { Client, ButtonBuilder, ButtonStyle, Collection, Events, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

// Console Notification that the bot is online.
client.on('ready', (c) => {
    console.log(`${c.user.tag} is online.`);
})

// Log the bot into Discord using the token in dotenv.
client.login(process.env.DISCORD_TOKEN);