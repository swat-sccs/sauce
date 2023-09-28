# syntax=docker/dockerfile:1

FROM node:18.18.0-bookworm-slim

ENV PORT=7567
EXPOSE 7567

RUN apt update
RUN apt install -y curl

HEALTHCHECK --interval=5s --timeout=30s --start-period=30s --retries=3 CMD [ "curl", "http://127.0.0.1:7567" ]

WORKDIR /sauce-app

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

COPY webStatic ./webStatic

RUN chown -R node:node ./
USER node

ENV NODE_ENV=production
ENV LDAP_URL="ldap://host.docker.internal:389"
ENV LOCAL_AGENT_URL="http://host.docker.internal:8526"

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
COPY emailTemplates ./emailTemplates
COPY views/ ./views
COPY _docs/ ./_docs
COPY _posts/ ./_posts

CMD node build/src/index.js
