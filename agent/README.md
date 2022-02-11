# SAUCE Agent

This is a small local agent to perform certain tasks on our server that require root permissions. It
communicates with the main process via HTTP requests, which allows the main SAUCE process to be
located in a container or elsewhere.

## Running

This process generally needs to be started with root access, which can make things a little bit
weird. `sudo npm start` won't work for unclear reasons (you'll just end up running without root
permissions). Instead, you'll need to do `npm run build` then `sudo node build/src/index.js`.

## API

The service exposes a simple HTTP API for performing tasks on the host.

### Authentication

The API is authorized by presenting a bearer token which is hashed via Argon2 and compared to the
stored hash from the SECRET_HASH environment variable (which can be set in a `.env` file). All HTTP
requests should present this token by setting the `Authorization` header:

```text
Authorization: Bearer [token]
```

### Methods

For all methods that have `username` and/or `classYear` parameters:

- `username` must be a valid POSIX username; that is, it must match the regex `^[a-z][-a-z0-9]*$`
- `classYear` must match the regex `^(\d\d|faculty|staff)$`

#### POST `/newUser/<classYear>/<username>`

Performs new user creation actions for the given username in class `classYear`.

#### GET `/forwardFile/<classYear>/<username>`

Returns the content (in the response body, in plaintext) of the `.forward` file in the home
directory of the given user.

#### POST `/forwardFile/<classYear>/<username>`

Overwrites the `.forward` file in the home directory of the given user with the contents of the
request body. The body should be sent in plaintext, and the request should have the
`Content-Type: text/plain` header.

#### POST `/mcWhitelist/<mc-uuid>`

Whitelists the Minecraft account indicated by the provided UUID. Specifically, runs the command
`[exec-script] command whitelist add [username]`, where `[exec-script]` is specified by the
`MINECRAFT_SERVER_EXEC_PATH` environment variable (on SCCS's systems, this points to a specific
Minecraft server management script) and `[username]` is the Minecraft username corresponding to the
provided Minecraft UUID.

#### DELETE `/mcWhitelist/<mc-uuid>`

Un-whitelists the Minecraft account indicated by the provided UUID. Specifically, runs the command
`[exec-script] command whitelist remove [username]`, where `[exec-script]` is specified by the
`MINECRAFT_SERVER_EXEC_PATH` environment variable (on SCCS's systems, this points to a specific
Minecraft server management script) and `[username]` is the Minecraft username corresponding to the
provided Minecraft UUID.
