#!/usr/bin/env bash

set -e

echo "Running tests in containers"
docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.test.yml up --build --exit-code-from=webdriver-tests sauce selenium-chrome webdriver-tests
