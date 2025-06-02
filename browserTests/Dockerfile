# syntax=docker/dockerfile:1

# STAGE 2
FROM node:22.10-bookworm
WORKDIR /home/node/app
COPY package*.json ./
COPY tsconfig.json ./
COPY src src/
RUN npm install

CMD ["npm", "run", "test"]
