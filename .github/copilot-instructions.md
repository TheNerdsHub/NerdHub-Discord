This is the Discord bot for the NerdHub application, built with Discord.js.

- It uses slash commands for interaction.
- It integrates with the NerdHub-Backend to fetch game data.
- Key files:
  - `index.js`: The main entry point for the bot.
  - `deploy-commands.js`: Script to register slash commands.
  - `commands/games/random-game.js`: Command to suggest a random game.
  - `commands/games/get-game.js`: Command to fetch details for a specific game.
- To run: `node index.js`.
