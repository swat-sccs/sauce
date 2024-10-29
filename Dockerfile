# syntax=docker/dockerfile:1

FROM node:22.10-bookworm-slim

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
ENV USER_AGENT_URL="http://pigeon.sccs.swarthmore.edu:3001"
ENV MC_AGENT_URL="http://chicken.sccs.swarthmore.edu:3001"

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
