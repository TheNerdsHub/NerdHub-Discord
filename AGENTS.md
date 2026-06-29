# NerdHub-Discord

Discord bot for the NerdHub application. Built with Discord.js v14, TypeScript, ESM.

## Tech Stack
- **Runtime:** Node.js 22+
- **Language:** TypeScript (strict mode, `verbatimModuleSyntax`, `exactOptionalPropertyTypes`)
- **Framework:** Discord.js v14 (slash commands, gateway intents)
- **Validation:** Zod (env config)
- **Logging:** Pino (structured JSON)
- **Build:** `tsc` → `dist/`
- **Dev:** `tsx watch` (hot reload)
- **Format/Lint:** Prettier + ESLint (flat config, strict type-checked)

## Project Structure
```
src/
  index.ts              — Entry point
  client.ts             — Client creation + intents
  config.ts             — Zod-validated env vars
  types.ts              — Shared interfaces
  deploy-commands.ts    — Register slash commands
  delete-commands.ts    — Unregister slash commands
  handlers/
    commandLoader.ts    — Dynamic command loading
    eventLoader.ts      — Event auto-registration
  events/
    ready.ts            — On ready
    interactionCreate.ts— Slash command handler
    messageCreate.ts    — Message-based quote detection
  commands/
    games/
      getGame.ts        — Fetch game by appid/name
      randomGame.ts     — Random game with filters
      sharedGame.ts     — Game shared among users
    quotes/
      randomQuote.ts    — Random quote
      quoteOfTheDay.ts  — Daily quote
      quoteStatus.ts    — Show quote monitoring config
      setQuoteChannel.ts— Configure quote monitoring
    users/
      linkSteam.ts      — Link Discord to Steam
    utility/
      checkHealth.ts    — Bot health check
  services/
    quoteService.ts     — Quote parsing + monitoring
  utils/
    logger.ts           — Pino logger
  lib/
    cooldowns.ts        — Per-user-per-command cooldowns
```

## Key Commands
| Command | Description |
|---------|-------------|
| `/getgame` | Fetch a game by App ID or name |
| `/randomgame` | Random game (filter by genre/platform) |
| `/sharedgame` | Games shared in a channel |
| `/random-quote` | Random quote |
| `/quote-of-the-day` | Daily quote (gold embed) |
| `/quote-status` | Check quote monitoring (admin) |
| `/set-quote-channel` | Set quote monitoring target (admin) |
| `/link-steam` | Link Discord to Steam ID |
| `/check-health` | Bot health + API status |

## Development
```bash
npm run dev      # Hot-reload dev server
npm run build    # Compile TS → dist/
npm start        # Run compiled output
npm run lint     # ESLint check
npm run format   # Prettier format
npm run typecheck # tsc --noEmit
```

## Docker
Uses multi-stage build: compile TS → slim production image.
```bash
docker build -f Dockerfile.discordbot -t nerdhub-discord .
```

## Environment (via `.env`)
See `.env.example` for all required vars. Validated at startup by Zod — missing/invalid vars cause immediate crash.

## Conventions
- Command files export a `Command`-typed default export with `data` (SlashCommandBuilder) and `execute` (async fn)
- Event files export a default object with `name`, `once?`, and `execute`
- Use `\uXXXX` Unicode escapes for emoji characters in TS source
- All API calls go through `env.API_URL_INTERNAL`
- Cooldowns: per-user-per-command via `Map` in `src/lib/cooldowns.ts`
