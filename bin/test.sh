#!/usr/bin/env bash

set -e

echo "Running tests in containers"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.test.yml up -d --build sauce selenium-chrome
echo "Waiting for services to come up..."
sleep 30
echo "Running tests"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.test.yml up --exit-code-from=webdriver-tests webdriver-tests 