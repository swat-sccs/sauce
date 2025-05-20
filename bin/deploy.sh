#!/usr/bin/env bash

echo "Deploying Stack"
docker compose -f docker-compose.yml build
docker stack deploy -c docker-compose.yml -c docker-compose.override.yml sauce