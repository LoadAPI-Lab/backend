# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
RUN pnpm config set store-dir /pnpm/store
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline

FROM deps AS dev
COPY . .
EXPOSE 3001
CMD ["pnpm", "start:dev"]

FROM deps AS build
COPY . .
RUN pnpm build
RUN pnpm prune --prod --ignore-scripts

FROM node:24-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/migrations ./migrations
USER node
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
