# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Application environment variables (configure in Portainer)
ENV OPENROUTER_API_KEY=""
ENV MODEL_CONTEXT=""
ENV MODEL_CODEGEN=""

# Expose the port
EXPOSE 4321

# Run the server
CMD ["node", "dist/server/entry.mjs"]
