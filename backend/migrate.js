const { initDb } = require('./db');

const run = async () => {
  const db = await initDb();
  await db.close();
  console.log('Migrations complete.');
};

run();
