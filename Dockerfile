
# --- deps stage: install ALL deps (incl. dev) to build
# CACHE BUSTER 2025-08-30-07:10 - FORCE REBUILD ALL LAYERS
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
# Rebuild native dependencies for Alpine Linux (fixes rollup platform binaries)
RUN npm rebuild

# --- build stage: build your app
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Rebuild platform binaries again in build stage for Alpine Linux
RUN npm rebuild
RUN npm run build

# --- runner stage: install ALL deps and copy build
# FIXED: Remove --omit=dev to prevent missing dependency errors
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV RAILWAY_CACHE_BUST=2025-08-30-07-15
COPY package*.json ./
RUN npm ci && npm cache clean --force

# bring in the compiled output
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/public ./public

# Expose port for Railway
EXPOSE 10000

# Start the application
CMD ["npm", "run", "start"]
