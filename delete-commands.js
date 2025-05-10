const { REST, Routes } = require('discord.js');
require('dotenv').config();

const args = process.argv.slice(2);
const clientId = args[0]; // process.env.CLIENT_ID;
const guildId = args[1]; // process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;

const rest = new REST().setToken(token);


// for guild-based commands
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);

// for global commands
/*
rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);
*/