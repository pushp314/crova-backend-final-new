FROM node:20-alpine

WORKDIR /usr/src/app

# Install system dependencies (if any needed, e.g. for builds)
# RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy app source
COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

EXPOSE 8080

CMD ["node", "server.js"]
