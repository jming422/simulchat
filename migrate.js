// Load from .env if available
const dotenv = require('dotenv');
dotenv.config();

const pg = require('pg');
const DBMigrate = require('db-migrate');

async function main() {
  const dbm = DBMigrate.getInstance(true, { throwUncatched: true });

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    // That number is the decimal representation of the string "migrate!" - Any bigint will do, but I like this one :)
    console.log('Acquiring migration advisory lock...');
    const lockedRes = await client.query('SELECT pg_try_advisory_lock(7883946363647714593)');
    if (!lockedRes.rows[0]) {
      throw new Error('Unable to obtain migration lock; another migration process must be happening on this database!');
    }

    // The migrations may throw an exception, so release the advisory lock inside a `finally` block
    try {
      await dbm.up();
    } finally {
      console.log('Releasing migration advisory lock...');
      const unlockedRes = await client.query('SELECT pg_advisory_unlock(7883946363647714593)');
      if (!unlockedRes.rows[0]) {
        console.error("Wasn't holding the migration lock 🙀 This should never happen!");
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = main;
