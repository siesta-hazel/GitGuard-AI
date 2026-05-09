# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code and views
COPY . .

# Create directory for SQLite database (will be overridden by volume)
RUN mkdir -p /app/data

# Expose port (default 3000)
EXPOSE 3000

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the server
CMD ["node", "server.js"]