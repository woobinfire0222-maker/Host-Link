---
name: DB bootstrap
description: How to create DB tables when drizzle-kit push is unavailable (no TTY)
---

`drizzle-kit push` requires a TTY — cannot be run non-interactively in bash.

**Workaround:** Use raw SQL via node + pg directly:
```js
node -e "
const { Pool } = require('./node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('CREATE TABLE IF NOT EXISTS ...').then(...).catch(...);
"
```

Tables created: `users`, `sites`, `bots`, `site_data`
`session` table: auto-created by `connect-pg-simple` when `createTableIfMissing: true` is set in the store config.

**Why:** The DB schema must be in sync with Drizzle ORM schema definitions; app crashes without tables.
