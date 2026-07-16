# Layer build & run cho NodeJS backend
FROM node:22-alpine

WORKDIR /app

# Copy lockfiles and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy codebase
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
