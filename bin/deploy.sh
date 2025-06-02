#!/usr/bin/env bash

echo "Deploying Stack"
docker compose -f docker-compose.yml -f docker-compose.override.yml build
docker stack deploy -c docker-compose.yml -c docker-compose.override.yml sauce
docker service update --force sauce_sauce
