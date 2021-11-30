# SAUCE

The SCCS Account and User Control Engine, a replacement for GUTS (the Grand 
Unified Task System). Written mostly in TypeScript on top of Express.js and 
MongoDB. Uses Pug for rendering pages and Bootstrap for styling.

*Very* WIP at the moment.

## Development

```
npm install
```

Requires a MongoDB instance and LDAP server; these can be configured in a `.env`
file. An example `.env` is provided in `.env.example`.

The repo is set up to run Prettier and ESLint before each commit.