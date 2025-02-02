FROM node:20.10-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build (if necessary)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Add system user
RUN addgroup --system --gid 1001 botuser
RUN adduser --system --uid 1001 botuser --ingroup botuser

# Copy necessary files
COPY --from=builder /app ./
RUN chown -R botuser:botuser /app

USER botuser

CMD ["node", "bot.js"]
