FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Copy the bot's source code
COPY . .

# Expose necessary ports (if needed)
EXPOSE 3000

# Command to run the bot
CMD ["node", "index.js"]
