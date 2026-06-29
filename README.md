# NerdHub-Discord

Discord bot for the NerdHub application, built with Discord.js v14 and TypeScript. The bot uses slash commands for all interactions and integrates with the NerdHub-Backend to fetch game data, monitor quotes, and link Steam profiles.

## Features

- **Random Game Suggestions**: Get a random game suggestion from the NerdHub library, with filters for genres and platforms.
- **Game Details**: Fetch and display detailed information for a specific game by App ID or name.
- **Shared Games**: Find games that are shared among multiple users in a channel.
- **Quote System**: Monitor designated channels for quotes, randomly fetch quotes, and see the quote of the day.
- **Steam Linking**: Link your Discord account to your Steam ID.

## Tech Stack
- **Runtime:** Node.js 22+
- **Language:** TypeScript
- **Framework:** Discord.js v14
- **Validation:** Zod (env config)
- **Logging:** Pino (structured JSON)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)
- [npm](https://www.npmjs.com/)
- A Discord Bot Token

### Configuration

1. Create a `.env` file in the root of the project (see `.env.example`).
2. Add the following environment variables to the `.env` file:
   ```env
   DISCORD_BOT_TOKEN="your-discord-bot-token-here"
   DISCORD_CLIENT_ID="your-discord-client-id"
   API_URL_INTERNAL="http://localhost:5000"
   ```

### Development

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the hot-reload dev server:**
   ```bash
   npm run dev
   ```

### Build & Production

1. **Deploy slash commands:**
   ```bash
   npm run build
   node dist/deploy-commands.js
   ```
2. **Start the compiled bot:**
   ```bash
   npm start
   ```

## Docker

Uses a multi-stage build to compile TS into a slim production image.
```bash
docker build -f Dockerfile.discordbot -t nerdhub-discord .
```
