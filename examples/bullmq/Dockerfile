# Use an official Node.js runtime as a parent image, based on Alpine
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

COPY package.json yarn.lock* ./

RUN yarn install --frozen-lockfile && yarn cache clean

# Copy the current directory contents into the container at /usr/src/app
COPY . .

COPY examples/bullmq/.docker.env .env

# Run the app when the container launches
CMD ["node", "examples/bullmq/index.js"]