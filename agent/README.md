# SAUCE Agent

This is a small local agent to perform certain tasks on our server that require root permissions. It
communicates with the main process via HTTP requests, which allows the main SAUCE process to be
located in a container or elsewhere.

## Authentication

The API is authorized by presenting a bearer token which is hashed via Argon2 and compared to the
stored hash from the SECRET_HASH environment variable (which can be set in a `.env` file).
