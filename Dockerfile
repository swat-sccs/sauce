# syntax=docker/dockerfile:1

FROM node:16.5.0

ENV PORT=3001
EXPOSE 3001

WORKDIR /sauce-app

ENV NODE_ENV=production
ENV LDAP_URL="ldap://host.docker.internal:389"
ENV LOCAL_AGENT_URL="http://host.docker.internal:8526"

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

RUN npm install 


COPY build/ .


# static files
COPY public/ ./public
COPY dist/ ./dist
COPY emailTemplates ./emailTemplates
COPY views/ ./views
COPY _docs/ ./_docs
COPY _posts/ ./_posts

COPY .env ./

CMD node src/index.js