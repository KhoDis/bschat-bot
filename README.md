# BS Chat Bot

A TypeScript + Node bot (Telegraf, Prisma, Inversify) with modular features.

## Quick start

```bash
# Install
npm ci

# Dev
npm run dev

# Build
npm run build

# Start (after build)
npm start

# Tests
npm test
npm run coverage

# Lint & Format
npm run lint
npm run lint:fix
npm run format:check
npm run format
```

## Environment

Required:

- `BOT_TOKEN`
- `DATABASE_URL`

Optional: `OPENROUTER_API_KEY`, `CRAFTY_BASE_URL`, `CRAFTY_API_KEY`, `GROUP_CHAT_ID`

## Conventions

- Use absolute imports via `@/` (see `tsconfig.json`).
- Keep modules cohesive: `*.module.ts` wires, `*.service.ts` contains logic, `*.repository.ts` talks to DB.
- One responsibility per file. Avoid files > 300 lines; split by concern.
- Prefer pure functions and dependency injection (Inversify) for side effects.
- Tests near code when practical; otherwise under `src/**/__tests__`.

## Proposed folder structure

```
src/
  app.ts              # bootstrap
  container.ts        # DI container
  modules/
    <feature>/
      <feature>.module.ts
      <feature>.service.ts
      <feature>.repository.ts
      types.ts
      __tests__/...
  utils/              # stateless helpers
  prisma/
    client.ts
```

## Refactor roadmap (high-level)

- Split oversized files (e.g., `src/modules/food/food.module.ts`) by concern.
- Standardize service/repository patterns across modules.
- Move shared logic to `src/utils` or `src/modules/common` with clear boundaries.
- Strengthen types and narrow `any`/`unknown` usage.
- Add unit tests for critical paths (permissions, scheduler, music game).
