import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI;
const geminiKey = process.env.GEMINI_KEY;
const dbName = process.env.DB_NAME || 'pathpilot';

if (!mongoUri) {
  console.error('MONGODB_URI not set');
}

const client = new MongoClient(mongoUri ?? '', { serverSelectionTimeoutMS: 15000 });
let db;
async function initDb() {
  if (!mongoUri) throw new Error('MONGODB_URI not set');
  if (!db) {
    await client.connect();
    db = client.db(dbName);
  }
}

async function callGemini(payload) {
  if (!geminiKey) throw new Error('GEMINI_KEY not set');
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=' + encodeURIComponent(geminiKey);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('Gemini error ' + r.status + ': ' + txt);
  return JSON.parse(txt);
}

// Health
app.get('/', (_, res) => res.send('OK'));

// Careers examples
app.get('/careers', async (_, res) => {
  try {
    await initDb();
    const list = await db.collection('careers').find({}).limit(100).toArray();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/careers', async (req, res) => {
  try {
    await initDb();
    const result = await db.collection('careers').insertOne(req.body);
    res.json({ insertedId: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Quiz results examples
app.post('/quiz-results', async (req, res) => {
  try {
    await initDb();
    const result = await db.collection('quiz_results').insertOne({ ...req.body, createdAt: new Date() });
    res.json({ insertedId: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/quiz-results/:userId', async (req, res) => {
  try {
    await initDb();
    const list = await db
      .collection('quiz_results')
      .find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Gemini proxies
app.post('/trending', async (req, res) => {
  try {
    const { count = 24 } = req.body || {};
    const prompt = `List ${count} trending, diverse careers with title, category, shortDescription, icon (emoji), 3-5 skills. Return JSON array.`;
    const data = await callGemini({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/recommend', async (req, res) => {
  try {
    const { preferences = {}, limit = 12 } = req.body || {};
    const prompt = `Given preferences: ${JSON.stringify(preferences)}, recommend ${limit} diverse careers (title, category, reason, 3-5 skills). Return JSON array.`;
    const data = await callGemini({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/enrich', async (req, res) => {
  try {
    const { titles = [] } = req.body || {};
    const prompt = `For titles: ${JSON.stringify(titles)} return realistic stats (salary USD range, growth %, demand, remote %, education) + 3-5 skills. JSON keyed by title.`;
    const data = await callGemini({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API listening on ' + port));


