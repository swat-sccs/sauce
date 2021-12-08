# SAUCE

The SCCS Account and User Control Engine, a replacement for GUTS (the Grand Unified Task System).
Written mostly in TypeScript on top of Express.js and MongoDB. Uses Pug for rendering pages and
Bootstrap for styling.

_Very_ WIP at the moment.

## Development

```
npm install
```

Requires a MongoDB instance and LDAP server; these can be configured in a `.env` file. An example
`.env` is provided in `.env.example`.

To install git hooks to run Prettier and ESLint before each commit, run `npm run installHooks`.

### Folder Structure

- `/emailTemplates`: Basic plaintext templates for emails. Email templating uses
  [this one-liner](https://stackoverflow.com/a/41077811), so variable incorporation is just
  `${templateVariable}`.
- `/views`: Pug templates for the web interface
  - `/views/include`: Common code for all templates (e.g. `sauce-container` to add headers and
    footers)
  - `/views/js`: Client-side JavaScript for incorporation into templated pages
- `/src`: Server code; root folder contains `index.ts` with main configuration
  - `/src/functions`: Functions that will be run on a delayed basis (e.g. `createUser`); contains
    business logic to actually do those tasks.
  - `/src/routes`: HTTP routing code for app functions
  - `/src/integration`: Definitions and config for all external services (MongoDB, LDAP, SMTP
    server, etc.)
  - `/src/util`: Misc utilities
