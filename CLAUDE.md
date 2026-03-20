# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Development with hot reload (tsx watch)
npm run build      # Compile TypeScript + resolve path aliases
npm run start      # Run compiled bot
npm test           # Run all tests (Vitest)
npm run coverage   # Generate test coverage report
```

Docker (local dev with PostgreSQL):
```bash
docker compose -f docker-compose.dev.yml up -d   # Start local DB
```

## Architecture

A Telegraf-based Telegram bot using **Inversify** for dependency injection and **Composer-based middleware** for modular routing.

### Entry Point & Middleware Stack

`src/app.ts` initializes the bot and composes middleware in order:
- Private chat → `MusicGameUploadModule` (for submitting music)
- Group chat → composed stack of feature modules

### Module Pattern

All modules extend `Composer<IBotContext>` and register handlers (`this.command()`, `this.on()`, `this.action()`) in their constructor. Modules are wired in `src/container.ts` via Inversify symbols defined in `src/types.ts`.

```
src/modules/
├── musicGame/     # Core music guessing game (game lifecycle, rounds, guesses, leaderboard)
├── common/        # Config, text/member/args services, global commands
├── permissions/   # Role-based access control with @RequirePermission decorator
├── joke/          # Entertainment: joker, llm, sorry, trigger modules
├── crafty/        # Minecraft server integration
└── food/          # Food category triggers
```

### Key Patterns

- **DI**: Services are `@injectable()`, injected via `@inject(TYPES.X)`, registered in `src/container.ts`
- **Error handling**: `Result<T, E>` monad in `src/utils/Result.ts` with `.map()`, `.andThen()`, `.matchAsync()`, etc.
- **Validation**: Zod schemas in `src/schemas.ts`; Telegram IDs use `BigInt`
- **Permissions**: Bitfield-based RBAC; use `@RequirePermission('permission_name')` decorator on handler methods
- **Localization**: i18next with `locales/en.json` and `locales/ru.json`; custom response templates in `responses/`
- **Context**: `IBotContext` (in `src/context/context.interface.ts`) extends Telegraf context with `scene` and `session`

### Database

Prisma + PostgreSQL. Schema at `prisma/schema.prisma`. Models: `User`, `Chat`, `Game`, `GameRound`, `Guess`, `Member`, `Role`, `FoodCategory`, `FoodTrigger`.

Run migrations: `npx prisma migrate dev` (dev) or handled automatically via `migrate-and-start.sh` in Docker.

### Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json` and `vitest.config.ts`).
