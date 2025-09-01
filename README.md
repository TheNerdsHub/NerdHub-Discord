# NerdHub-Discord

This repository contains the Discord bot for the NerdHub application, built with Discord.js. The bot uses slash commands for all interactions and integrates with the NerdHub-Backend to fetch game data.

## Features

- **Random Game Suggestions**: Get a random game suggestion from the NerdHub library.
- **Game Details**: Fetch and display detailed information for a specific game.
- **Shared Games**: Find games that are shared among multiple users.

## Key Files

- `index.js`: The main entry point for the bot.
- `deploy-commands.js`: A script to register slash commands with Discord.
- `commands/games/random-game.js`: The command for suggesting a random game.
- `commands/games/get-game.js`: The command for fetching details of a specific game.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/)
- A Discord Bot Token

### Configuration

1.  Create a `.env` file in the root of the project.
2.  Add the following environment variables to the `.env` file:
    ```
    DISCORD_TOKEN="your-discord-token-here"
    MONGO_URI="your-mongo-connection-string-here"
    ```

### Running Locally

1.  **Install dependencies:**
    ```sh
    npm install
    ```
2.  **Deploy slash commands:**
    ```sh
    node deploy-commands.js
    ```
3.  **Start the bot:**
    ```sh
    node index.js
    ```