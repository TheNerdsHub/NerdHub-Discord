// Imports
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { Client, ButtonBuilder, ButtonStyle, Collection, Events, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');

client.commands = new Collection();

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

// Connect to MongoDB using Mongoose 
/* mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// Create the Game Schema
const gameSchema = new mongoose.Schema({
    name: String
});

// Create the Game model
const Game = mongoose.model('Game', gameSchema);
*/

// Check if this is necessary
const prefix = '/';

// Outline from documentation
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
  
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
  
    if (command === 'random') {
      // Implement logic to fetch a random game from the MongoDB collection
      message.reply({ content: 'Fetching a random game...', ephemeral: true });

    } else if (command === 'random:paid') {
      // Implement logic to fetch a random paid game from the MongoDB collection
      message.reply({ content: 'Fetching a random paid game...', ephemeral: true });

    } else if (command === 'random:free') {
      // Implement logic to fetch a random free game from the MongoDB collection
      message.reply({ content: 'Fetching a random free game...', ephemeral: true });
    }
  });

// Log the bot into Discord using the token in dotenv.
client.login(process.env.DISCORD_TOKEN);