FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install ALL deps (need devDeps for Vite build)
RUN npm ci

COPY . .

# Build the React frontend → outputs to public/dist/
RUN npm run build

# Remove devDependencies after build to slim the image
RUN npm prune --production

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD ["node", "server.js"]