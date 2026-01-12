const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'change-me';
const adminUser = process.env.ADMIN_USER || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

app.use(cors());
app.use(express.json());

const toPostResponse = (row) => {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    categories: JSON.parse(row.categories || '[]'),
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Missing authorization header.' });
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization header.' });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== adminUser || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign({ sub: username }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token });
});

app.get('/api/posts', async (req, res) => {
  const db = await req.app.locals.db;
  const posts = await db.all(
    `SELECT * FROM posts
     WHERE status = 'published'
     ORDER BY datetime(published_at) DESC, datetime(created_at) DESC`
  );
  res.json(posts.map(toPostResponse));
});

app.get('/api/admin/posts', authMiddleware, async (req, res) => {
  const db = await req.app.locals.db;
  const posts = await db.all(
    'SELECT * FROM posts ORDER BY datetime(created_at) DESC'
  );
  res.json(posts.map(toPostResponse));
});

app.post('/api/posts', authMiddleware, async (req, res) => {
  const db = await req.app.locals.db;
  const { title, slug, excerpt, content, categories } = req.body || {};
  if (!title || !slug || !excerpt || !content) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const categoriesValue = Array.isArray(categories) ? categories : [];
  const now = new Date().toISOString();
  try {
    const result = await db.run(
      `INSERT INTO posts
        (title, slug, excerpt, content, categories, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`
      ,
      [
        title,
        slug,
        excerpt,
        content,
        JSON.stringify(categoriesValue),
        now,
        now,
      ]
    );
    const post = await db.get('SELECT * FROM posts WHERE id = ?', result.lastID);
    return res.status(201).json(toPostResponse(post));
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create post.' });
  }
});

app.put('/api/posts/:id', authMiddleware, async (req, res) => {
  const db = await req.app.locals.db;
  const { id } = req.params;
  const { title, slug, excerpt, content, categories, status } = req.body || {};
  const existing = await db.get('SELECT * FROM posts WHERE id = ?', id);
  if (!existing) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  const updated = {
    title: title ?? existing.title,
    slug: slug ?? existing.slug,
    excerpt: excerpt ?? existing.excerpt,
    content: content ?? existing.content,
    categories: Array.isArray(categories) ? categories : JSON.parse(existing.categories),
    status: status ?? existing.status,
    published_at: existing.published_at,
  };
  const now = new Date().toISOString();
  await db.run(
    `UPDATE posts
     SET title = ?, slug = ?, excerpt = ?, content = ?, categories = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      updated.title,
      updated.slug,
      updated.excerpt,
      updated.content,
      JSON.stringify(updated.categories),
      updated.status,
      now,
      id,
    ]
  );
  const post = await db.get('SELECT * FROM posts WHERE id = ?', id);
  return res.json(toPostResponse(post));
});

app.post('/api/posts/:id/publish', authMiddleware, async (req, res) => {
  const db = await req.app.locals.db;
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM posts WHERE id = ?', id);
  if (!existing) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  const now = new Date().toISOString();
  await db.run(
    `UPDATE posts
     SET status = 'published', published_at = ?, updated_at = ?
     WHERE id = ?`,
    [now, now, id]
  );
  const post = await db.get('SELECT * FROM posts WHERE id = ?', id);
  return res.json(toPostResponse(post));
});

const start = async () => {
  const db = await initDb();
  app.locals.db = db;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

start();
