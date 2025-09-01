const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Load quote monitoring configuration (supports both single channels and categories)
async function loadQuoteMonitoringConfig(guildId) {
    try {
        const response = await fetch(`${process.env.BACKEND_URL}/api/QuoteCategories/guild/${guildId}`);
        
        if (response.ok) {
            const config = await response.json();
            
            const processedConfig = {
                type: config.categoryName.startsWith('#') ? 'single' : 'category',
                id: config.categoryId,
                name: config.categoryName
            };
            return processedConfig;
        }
        return null;
    } catch (error) {
        console.log('No quote monitoring configured yet.');
        return null;
    }
}

// Check if message should be monitored for quotes
function shouldMonitorMessage(message, config) {
    if (!config || message.author.bot) {
        return false;
    }
    
    if (config.type === 'single') {
        // Single channel mode: check if message is in the specific channel
        return message.channelId === config.id;
    } else {
        // Category mode: check if message is in a text channel within the category
        return message.channel.parent && 
               message.channel.parent.id === config.id && 
               message.channel.type === 0; // GUILD_TEXT
    }
}

// Quote parsing function
function parseQuote(message) {
    const content = message.trim();
    
    // Format 1: "Quote text" - Person
    const singleQuoteMatch = content.match(/^"(.+)"\s*-\s*(.+)$/);
    if (singleQuoteMatch) {
        return {
            quoteText: singleQuoteMatch[1].trim(),
            quotedPersons: [singleQuoteMatch[2].trim()]
        };
    }
    
    // Format 2: Multi-person quotes
    // Person1: "Quote part 1"
    // Person2: "Quote part 2"
    const multiQuoteLines = content.split('\n').filter(line => line.trim());
    const isMultiQuote = multiQuoteLines.every(line => 
        line.match(/^[^:]+:\s*".*"?\s*$/)
    );
    
    if (isMultiQuote && multiQuoteLines.length > 1) {
        const quotedPersons = [];
        const quoteParts = [];
        
        for (const line of multiQuoteLines) {
            const match = line.match(/^([^:]+):\s*"(.*)"\s*$/);
            if (match) {
                const person = match[1].trim();
                const text = match[2].trim();
                quotedPersons.push(person);
                quoteParts.push(`${person}: "${text}"`);
            }
        }
        
        if (quotedPersons.length > 0 && quoteParts.length > 0) {
            return {
                quoteText: quoteParts.join('\n'),
                quotedPersons: [...new Set(quotedPersons)] // Remove duplicates
            };
        }
    }
    
    return null;
}

// Message handler for quotes
async function handleQuoteMessage(message) {
    const monitoringConfig = await loadQuoteMonitoringConfig(message.guild.id);
    
    if (!shouldMonitorMessage(message, monitoringConfig)) {
        return;
    }
    
    const parsedQuote = parseQuote(message.content);
    if (!parsedQuote) {
        return;
    }
    
    try {
        const quoteData = {
            quoteText: parsedQuote.quoteText,
            quotedPersons: parsedQuote.quotedPersons,
            submitter: message.author.displayName || message.author.username,
            discordUserId: message.author.id,
            channelId: message.channelId,
            channelName: message.channel.name,
            messageId: message.id,
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${process.env.BACKEND_URL}/api/Quotes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quoteData),
        });
        
        if (response.ok) {
            console.log(`Quote saved: "${parsedQuote.quoteText}" by ${parsedQuote.quotedPersons.join(', ')} from #${message.channel.name}`);
            // React to the message to indicate it was saved
            await message.react('📝');
        } else {
            console.error('Failed to save quote:', await response.text());
        }
    } catch (error) {
        console.error('Error saving quote:', error);
    }
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
    }
});

client.on(Events.MessageCreate, handleQuoteMessage);

client.login(token);