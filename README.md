# NerdHub-Discord
The discord bot for NerdHub.

For this to function, you need to add a file named .env with the following code:
```
DISCORD_TOKEN="your-discord-token-here"
MONGO_URI='your-mongo-connection-string-here'
APPLICATION_ID='your-application-id-here'
GUILD_ID='your-guild-id-here'
```

Discord token is from the Build-a-Bot section on the Discord Dev Portal
Application ID is taken from Dev Portal -> Your Application -> General Information -> Application Key
Guild ID requires the following steps: Go to Discord's settings -> Advanced -> Enable Developer Mode -> Escape -> Right Click the Desired Server -> Copy Server ID