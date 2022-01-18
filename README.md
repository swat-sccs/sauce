# SAUCE

The SCCS Account and User Control Engine, a replacement for GUTS (the Grand Unified Task System).
Written mostly in TypeScript on top of Express.js and MongoDB. Uses Pug for rendering pages and
Bootstrap for styling.

_Very_ WIP at the moment.

## Development

Installation:

```bash
npm install
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

Requires a MongoDB instance and LDAP server; these can be configured in a `.env` file. An example
`.env` is provided in `.env.example`.

The repo is set up to run Prettier and ESLint before each commit.

### Folder Structure

- `/emailTemplates`: Basic plaintext templates for emails. Email templating uses
  [this one-liner](https://stackoverflow.com/a/41077811), so variable incorporation is just
  `${templateVariable}`.
- `/views`: Pug templates for the web interface
  - `/views/include`: Common code for all templates (e.g. `sauce-container` to add headers and
    footers)
- `/src`: Server code; root folder contains `index.ts` with main configuration
  - `/src/controllers`: Business logic and controllers called from routes
  - `/src/error/`: HTTP and application error handling
  - `/src/functions`: Functions that will be run on a delayed basis (e.g. `createUser`); contains
    business logic to actually do those tasks.
  - `/src/routes`: HTTP routing code for app functions
  - `/src/integration`: Definitions and config for all external services (MongoDB, LDAP, SMTP
    server, etc.)
  - `/src/util`: Misc utilities
- `/webStatic`: Client-side static code (SCSS and JS). This is its own Node project built with
  Webpack.
