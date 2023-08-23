# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install bot dependencies
RUN npm install

# Copy your bot source code to the container
COPY . .

# Expose the port your bot listens on (if needed)
EXPOSE 4001

# Command to start your bot
CMD ["node", "bot.js"]
