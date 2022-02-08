# SAUCE Agent

This is a small local agent to perform certain tasks on our server that require root permissions. It
communicates with the main process via HTTP requests, which allows the main SAUCE process to be
located in a container or elsewhere.

## Authentication

The API is authorized by presenting a bearer token which is hashed via Argon2 and compared to the
stored hash from the SECRET_HASH environment variable (which can be set in a `.env` file).

## Running

This process generally needs to be started with root access, which can make things a little bit
weird. `sudo npm start` won't work for unclear reasons (you'll just end up running without root
permissions). Instead, you'll need to do `npm run build` then `sudo node build/src/index.js`.
