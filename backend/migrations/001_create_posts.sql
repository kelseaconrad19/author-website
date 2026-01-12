CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  categories TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
