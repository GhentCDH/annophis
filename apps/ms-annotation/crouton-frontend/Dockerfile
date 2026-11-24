# syntax=docker/dockerfile:1.7-labs
# Multi-stage build: Build Vue app, then serve with Caddy

FROM node:24-alpine AS build

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate
ENV CI=true

# Copy package.json files for dependency caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --parents apps/ms-annotation/*/package.json generated/ms-annotation/*/types/package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the Vue app
RUN NX_DAEMON=false pnpm exec nx build ms-annotation-frontend --prod

# Production stage with Caddy web server
FROM caddy:2-alpine

# Build arguments for version and git sha
ARG VERSION
ARG BUILD_SHA

# Set as environment variables for runtime
ENV APP_VERSION=${VERSION:-unknown}
ENV BUILD_SHA=${BUILD_SHA:-unknown}
ENV NODE_ENV=production

# Copy entrypoint script
COPY --from=build /app/apps/ms-annotation/crouton-frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy Caddy configuration
COPY --from=build /app/apps/ms-annotation/crouton-frontend/Caddyfile /etc/caddy/Caddyfile

# Copy built assets from build stage
COPY --from=build /app/apps/ms-annotation/crouton-frontend/dist /srv

# Expose port 9000
EXPOSE 9000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
