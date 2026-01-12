const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const databaseUrl = process.env.DATABASE_URL || path.join(__dirname, 'data', 'author.db');

const ensureDatabaseDir = () => {
  const dir = path.dirname(databaseUrl);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const runMigrations = async (db) => {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  await db.exec(
    'CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, run_at TEXT NOT NULL)'
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const existing = await db.get('SELECT id FROM migrations WHERE id = ?', file);
    if (existing) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
    await db.run('INSERT INTO migrations (id, run_at) VALUES (?, ?)', [
      file,
      new Date().toISOString(),
    ]);
  }
};

const initDb = async () => {
  ensureDatabaseDir();
  const db = await open({
    filename: databaseUrl,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA foreign_keys = ON');
  await runMigrations(db);
  return db;
};

module.exports = {
  initDb,
  runMigrations,
  databaseUrl,
};
