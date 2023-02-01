# SAUCE

The SCCS Account and User Control Engine, or SAUCE, is the central dashboard for SCCS services. The
project replaces GUTS (the Grand Unified Task System) and SCCS's previous static homepage.

## Features

- Cool landing page
- On-the-fly generation of newsfeed posts and public-facing documentation from Markdown files
  (somewhat similar to Jekyll)
- Login using our LDAP server
- Integrations with our other services:
  - Account creation
  - Mailing lists
  - Minecraft server
- Secure password hashing with Argon2
- Admin dashboard with request management and user database search
- Seperate agent process to perform some tasks requiring root access
- Notification emails for users and admins

## Development

The backend is written in TypeScript on top of Express.js and MongoDB. Pages are rendered from Pug
templates with some JavaScript logic, though since the frontend JS/CSS is prebuilt with Webpack and
served statically, using other languages on the backend would be fairly trivial. It uses Bootstrap 5
for most styling, with some customizations applied using SCSS.

### Docker

Start containers for development:

```
bin/dev.sh
```

A mock LDAP server is included with two users: `testadmin` and `testuser` (both with password
`test`). For development, the source directories in the container are mounted to their local
counterparts, so code changes will be reflected in the container without rebuilds. (You will need to
wait for webpack, etc. to finish building in the container when changing static assets.)

To run automated integration tests:

```
bin/test.sh
```

For production, certain secrets and config should be specified in a `docker-compose.override.yml`
file. Also, the agent needs to be running somewhere on the system (see its README in `agent/`).
Then, launch the backend:

```
docker-compose up
```

### Local Development

Installation:

```bash
npm install
# only necessary if you are using the local agent
npm run install:agent
```

Build static web files and compile TypeScript:

```bash
npm run build
```

Run the server:

```bash
npm start
```

Or in production:

```
node build/src/index.js
```

The app requires various credentials for other services (LDAP, Mailman, SMTP...) which can be
configured in a `.env` file. An example `.env` is provided in `.env.example`.

To install git hooks to run Prettier and ESLint before each commit, run `npm run installHooks`.

### Folder Structure

- `/agent`: A seperate, self-contained service to run certain management tasks that require root
  access to the server.
- `/browserTests`: Selenium WebDriver tests that are run through Docker.
- `/emailTemplates`: Basic plaintext templates for emails. Email templating uses
  [this one-liner](https://stackoverflow.com/a/41077811), so variable incorporation is just
  `${templateVariable}`.
- `/views`: Pug templates for the web interface
  - `/views/include`: Common code for all templates (e.g. `sauce-container` to add headers and
    footers)
- `/src`: Server code; root folder contains `index.ts` with main configuration
  - `/src/controllers`: Business logic and controllers called from routes
  - `/src/error`: HTTP and application error handling
  - `/src/functions`: Functions that will be run on a delayed basis (e.g. `createUser`); contains
    business logic to actually do those tasks.
  - `/src/routes`: HTTP routing code for app functions
  - `/src/integration`: Definitions and config for all external services (MongoDB, LDAP, SMTP
    server, etc.)
  - `/src/util`: Misc utilities
- `/webStatic`: Client-side static code (SCSS and JS). This is its own Node project built with
  Webpack.
