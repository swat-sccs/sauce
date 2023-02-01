# syntax=docker/dockerfile:1

# STAGE 2
FROM node:16.5.0
WORKDIR /home/node/app
COPY package*.json ./
COPY tsconfig.json ./
COPY src src/
RUN npm install

CMD ["npm", "run", "test"]