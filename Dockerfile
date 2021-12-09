# syntax=docker/dockerfile:1

FROM node:17

ENV PORT=3001
EXPOSE 3001

WORKDIR /sauce-app

ENV NODE_ENV=production
ENV LDAP_URL="ldap://host.docker.internal:389"

COPY package.json ./
COPY tsconfig.json ./

RUN npm install 


COPY build/ .


# static files
COPY public/ ./public
COPY emailTemplates ./emailTemplates
COPY views/ ./views

COPY .env ./

CMD node src/index.js