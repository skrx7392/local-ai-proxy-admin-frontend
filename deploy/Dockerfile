# 1. Dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 2. Build
FROM node:24-alpine AS builder
ARG GIT_SHA=unknown
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_GIT_SHA=${GIT_SHA}
# Build-time placeholders ONLY — real values come from the k8s Secret at runtime.
# Next imports route handlers during `next build` to analyze them; if the auth
# options module fail-fasts on missing AUTH_SECRET (<32 chars) or BACKEND_URL,
# the build aborts here. These placeholders satisfy those validators without
# ever being used at runtime (the container re-reads from env when it starts).
ENV AUTH_SECRET="build-time-placeholder-32-chars-minimum-length-ok"
ENV BACKEND_URL="http://build-time-placeholder:80"
RUN npm run build

# 3. Runtime
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
