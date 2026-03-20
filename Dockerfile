FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@10.31.0 && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
# Install pnpm for build stage
RUN npm install -g pnpm@10.31.0
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG SAAS_MVP_ENABLED=0
ARG NEXT_PUBLIC_MODEL_LIST=""
ARG NEXT_PUBLIC_DISABLED_AI_PROVIDER=""
ARG NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER=""

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Build-time Supabase public variables must come from docker build args.
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
ENV SAAS_MVP_ENABLED=${SAAS_MVP_ENABLED}
ENV NEXT_PUBLIC_SAAS_MVP_ENABLED=${SAAS_MVP_ENABLED}
ENV NEXT_PUBLIC_MODEL_LIST=${NEXT_PUBLIC_MODEL_LIST}
ENV NEXT_PUBLIC_DISABLED_AI_PROVIDER=${NEXT_PUBLIC_DISABLED_AI_PROVIDER}
ENV NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER=${NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER}

# Set build mode to standalone for Docker deployment
ENV NEXT_PUBLIC_BUILD_MODE=standalone

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Build args for runtime configuration
ARG SAAS_MVP_ENABLED=0
ARG NEXT_PUBLIC_MODEL_LIST=""
ARG NEXT_PUBLIC_DISABLED_AI_PROVIDER=""
ARG NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER=""

ENV NODE_ENV=production
ENV NEXT_PUBLIC_BUILD_MODE=standalone
ENV NEXT_PUBLIC_SAAS_MVP_ENABLED=${SAAS_MVP_ENABLED}
ENV NEXT_PUBLIC_MODEL_LIST=${NEXT_PUBLIC_MODEL_LIST}
ENV NEXT_PUBLIC_DISABLED_AI_PROVIDER=${NEXT_PUBLIC_DISABLED_AI_PROVIDER}
ENV NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER=${NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER}

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
