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

COPY webStatic ./webStatic

# install everything for building
RUN NODE_ENV=development npm install

RUN npm run build:webStatic
RUN npm run packageWebStatic

# build this last and separately from the other steps so we don't rebuild JS on SAUCE changes,
# keep the docker cache good
COPY src ./src
RUN npm run build:sauce

# static files
COPY public/ ./public
COPY dist/ ./dist
COPY emailTemplates ./emailTemplates
COPY views/ ./views
COPY _docs/ ./_docs
COPY _posts/ ./_posts

COPY *.env ./

CMD node build/src/index.js
