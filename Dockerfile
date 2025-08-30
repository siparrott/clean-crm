
# --- deps stage: install ALL deps (incl. dev) to build
# Cache bust: 2025-08-30-fix
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- build stage: build your app
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner stage: install only prod deps and copy build
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
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
