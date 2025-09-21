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

async function callGemini(payload, fallbackType = 'trending', fallbackParams = {}) {
  if (!geminiKey) throw new Error('GEMINI_KEY not set');
  // Use a lighter model to avoid free-tier quota quickly
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(geminiKey);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await r.text();
  if (!r.ok) {
    // On 429 or any error, fall back to a minimal compatible response
    if (r.status === 429) {
      if (fallbackType === 'quiz') {
        return buildQuizFallbackCandidates(fallbackParams.numQuestions || 10);
      } else if (fallbackType === 'recommendations') {
        return buildRecommendationsFallbackCandidates();
      } else {
        return buildTrendingFallbackCandidates();
      }
    }
    throw new Error('Gemini error ' + r.status + ': ' + txt);
  }
  return JSON.parse(txt);
}

function buildTrendingFallbackCandidates() {
  const careers = [
    { id:'ai_engineer', title:'AI Engineer', description:'Build and deploy AI/ML systems for products.', category:'Technology', requiredSkills:['python','ml'], recommendedSkills:['LLMs'], averageSalary:125000, growthPotential:'High', companies:['OpenAI'], courses:['DL Spec'], imageUrl:'' },
    { id:'data_scientist', title:'Data Scientist', description:'Analyze data and build predictive models.', category:'Data Science', requiredSkills:['python','statistics'], recommendedSkills:['sql'], averageSalary:110000, growthPotential:'High', companies:['Netflix'], courses:['Intro to ML'], imageUrl:'' },
    { id:'ux_designer', title:'UX Designer', description:'Design intuitive user experiences.', category:'Design', requiredSkills:['research','wireframing'], recommendedSkills:['prototyping'], averageSalary:90000, growthPotential:'Medium', companies:['Figma'], courses:['UX Foundations'], imageUrl:'' },
    { id:'product_manager', title:'Product Manager', description:'Drive product vision and execution.', category:'Business', requiredSkills:['communication'], recommendedSkills:['analytics'], averageSalary:120000, growthPotential:'High', companies:['Google'], courses:['PM Fundamentals'], imageUrl:'' },
    { id:'nurse_practitioner', title:'Nurse Practitioner', description:'Provide healthcare services.', category:'Healthcare', requiredSkills:['patient care'], recommendedSkills:['informatics'], averageSalary:105000, growthPotential:'High', companies:['Hospitals'], courses:['Clinical'], imageUrl:'' },
    { id:'financial_analyst', title:'Financial Analyst', description:'Analyze financial data.', category:'Finance', requiredSkills:['excel','modeling'], recommendedSkills:['sql'], averageSalary:90000, growthPotential:'Medium', companies:['Banks'], courses:['Finance'], imageUrl:'' },
    { id:'teacher', title:'Teacher', description:'Educate students.', category:'Education', requiredSkills:['instruction'], recommendedSkills:['assessment'], averageSalary:65000, growthPotential:'Medium', companies:['Schools'], courses:['Education'], imageUrl:'' },
    { id:'digital_marketer', title:'Digital Marketer', description:'Run campaigns and grow brand reach.', category:'Marketing', requiredSkills:['seo','content'], recommendedSkills:['analytics'], averageSalary:80000, growthPotential:'Medium', companies:['Agencies'], courses:['Marketing'], imageUrl:'' },
    { id:'civil_engineer', title:'Civil Engineer', description:'Design infrastructure.', category:'Engineering', requiredSkills:['cad'], recommendedSkills:['materials'], averageSalary:98000, growthPotential:'Medium', companies:['AEC'], courses:['Civil'], imageUrl:'' },
    { id:'graphic_designer', title:'Graphic Designer', description:'Create visual concepts.', category:'Arts', requiredSkills:['photoshop'], recommendedSkills:['illustration'], averageSalary:70000, growthPotential:'Low', companies:['Studios'], courses:['Design'], imageUrl:'' }
  ];
  const text = JSON.stringify({ careers });
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

function buildQuizFallbackCandidates(numQuestions = 10) {
  const allQuestions = [
    {
      id: "q1",
      question: "How do you prefer to work?",
      options: [
        {"id": "a", "text": "Independently"},
        {"id": "b", "text": "In a team"},
        {"id": "c", "text": "With guidance"},
        {"id": "d", "text": "Leading others"}
      ],
      correctAnswerId: "b",
      explanation: "This helps assess your working style preference.",
      points: 2
    },
    {
      id: "q2", 
      question: "What motivates you most?",
      options: [
        {"id": "a", "text": "Recognition"},
        {"id": "b", "text": "Learning new things"},
        {"id": "c", "text": "Helping others"},
        {"id": "d", "text": "Financial rewards"}
      ],
      correctAnswerId: "b",
      explanation: "This reveals your primary motivation drivers.",
      points: 2
    },
    {
      id: "q3",
      question: "How do you handle stress?",
      options: [
        {"id": "a", "text": "Take breaks and relax"},
        {"id": "b", "text": "Work harder to solve it"},
        {"id": "c", "text": "Ask for help"},
        {"id": "d", "text": "Ignore it and move on"}
      ],
      correctAnswerId: "a",
      explanation: "This shows your stress management approach.",
      points: 2
    },
    {
      id: "q4",
      question: "What type of environment do you prefer?",
      options: [
        {"id": "a", "text": "Quiet and focused"},
        {"id": "b", "text": "Dynamic and fast-paced"},
        {"id": "c", "text": "Collaborative and social"},
        {"id": "d", "text": "Creative and flexible"}
      ],
      correctAnswerId: "c",
      explanation: "This indicates your ideal work environment.",
      points: 2
    },
    {
      id: "q5",
      question: "How do you make decisions?",
      options: [
        {"id": "a", "text": "Quickly and intuitively"},
        {"id": "b", "text": "After careful analysis"},
        {"id": "c", "text": "With input from others"},
        {"id": "d", "text": "Based on past experience"}
      ],
      correctAnswerId: "b",
      explanation: "This reveals your decision-making style.",
      points: 2
    },
    {
      id: "q6",
      question: "What do you value most in a career?",
      options: [
        {"id": "a", "text": "Job security"},
        {"id": "b", "text": "Growth opportunities"},
        {"id": "c", "text": "Work-life balance"},
        {"id": "d", "text": "Making a difference"}
      ],
      correctAnswerId: "d",
      explanation: "This shows your career priorities.",
      points: 2
    },
    {
      id: "q7",
      question: "How do you prefer to learn?",
      options: [
        {"id": "a", "text": "Through hands-on practice"},
        {"id": "b", "text": "By reading and studying"},
        {"id": "c", "text": "Through discussion and debate"},
        {"id": "d", "text": "By watching demonstrations"}
      ],
      correctAnswerId: "a",
      explanation: "This indicates your learning style preference.",
      points: 2
    },
    {
      id: "q8",
      question: "What type of problems do you enjoy solving?",
      options: [
        {"id": "a", "text": "Technical and logical"},
        {"id": "b", "text": "Creative and artistic"},
        {"id": "c", "text": "People and relationship issues"},
        {"id": "d", "text": "Strategic and planning problems"}
      ],
      correctAnswerId: "a",
      explanation: "This reveals your problem-solving preferences.",
      points: 2
    },
    {
      id: "q9",
      question: "How do you handle feedback?",
      options: [
        {"id": "a", "text": "Welcome it and use it to improve"},
        {"id": "b", "text": "Consider it carefully"},
        {"id": "c", "text": "Feel defensive initially"},
        {"id": "d", "text": "Ignore negative feedback"}
      ],
      correctAnswerId: "a",
      explanation: "This shows your openness to growth and improvement.",
      points: 2
    },
    {
      id: "q10",
      question: "What energizes you most?",
      options: [
        {"id": "a", "text": "Meeting new people"},
        {"id": "b", "text": "Completing challenging tasks"},
        {"id": "c", "text": "Learning something new"},
        {"id": "d", "text": "Helping others succeed"}
      ],
      correctAnswerId: "c",
      explanation: "This indicates what drives your motivation.",
      points: 2
    },
    {
      id: "q11",
      question: "How do you prefer to communicate?",
      options: [
        {"id": "a", "text": "Face-to-face conversations"},
        {"id": "b", "text": "Written messages and emails"},
        {"id": "c", "text": "Phone calls and video chats"},
        {"id": "d", "text": "Presentations and public speaking"}
      ],
      correctAnswerId: "a",
      explanation: "This shows your communication style preference.",
      points: 2
    },
    {
      id: "q12",
      question: "What role do you typically take in groups?",
      options: [
        {"id": "a", "text": "Leader and organizer"},
        {"id": "b", "text": "Contributor and supporter"},
        {"id": "c", "text": "Observer and analyzer"},
        {"id": "d", "text": "Mediator and peacemaker"}
      ],
      correctAnswerId: "b",
      explanation: "This reveals your natural group dynamics role.",
      points: 2
    }
  ];

  // Select the requested number of questions
  const selectedQuestions = allQuestions.slice(0, Math.min(numQuestions, allQuestions.length));
  
  const quiz = {
    id: `quiz_${Date.now()}`,
    title: "Personality Assessment Quiz",
    description: "A comprehensive quiz to assess your personality traits and preferences",
    questions: selectedQuestions
  };
  const text = JSON.stringify(quiz);
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

function buildRecommendationsFallbackCandidates() {
  const recommendations = {
    recommendations: [
      {"career": "Software Engineer", "explanation": "Based on your technical skills and problem-solving abilities."},
      {"career": "Data Analyst", "explanation": "Your analytical thinking makes you well-suited for data analysis."},
      {"career": "Project Manager", "explanation": "Your organizational and communication skills are perfect for project management."}
    ]
  };
  const text = JSON.stringify(recommendations);
  return { candidates: [{ content: { parts: [{ text }] } }] };
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
    // Final fallback if callGemini itself throws
    res.json(buildTrendingFallbackCandidates());
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

// Quiz generation endpoint
app.post('/quiz', async (req, res) => {
  try {
    const { topic, subcategory, difficulty, questionStyle, numQuestions = 5 } = req.body || {};
    const sub = (subcategory && subcategory !== 'General') ? ` in the subcategory "${subcategory}"` : '';
    const diff = difficulty ? ` at a ${difficulty} level` : '';
    const style = (questionStyle && questionStyle !== 'Multiple Choice') ? ` Use the ${questionStyle} style.` : '';
    const uniqueness = 'Each time you are called, generate a new, unique set of questions. Do not repeat previous questions. Randomize the content.';
    
    const prompt = `Generate ${numQuestions} unique questions${sub}${diff}.${style} ${uniqueness}

IMPORTANT: Each question must have:
1. A unique ID (q1, q2, q3...)
2. 4 options with unique IDs (a, b, c, d)
3. A correctAnswerId field pointing to the correct option
4. An explanation for why the answer is correct
5. Points value (1 for easy, 2 for medium, 3 for hard)

Respond ONLY in this exact JSON format:
{
  "id": "quiz_${Date.now()}",
  "title": "Quiz Title",
  "description": "Quiz description",
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correctAnswerId": "a",
      "explanation": "Why this is correct",
      "points": 2
    }
  ]
}`;
    
    const data = await callGemini({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }, 'quiz', { numQuestions });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Careers by category endpoint
app.post('/careers-by-category', async (req, res) => {
  try {
    const { category, count = 15 } = req.body || {};
    const prompt = `List ${count} diverse careers in the "${category}" category. For each career provide: title, category, shortDescription, icon (emoji), 3-5 skills. Return JSON array.`;
    const data = await callGemini({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Career recommendations endpoint
app.post('/career-recommendations', async (req, res) => {
  try {
    const { answers = [], limit = 3 } = req.body || {};
    const prompt = `Based on these quiz answers: ${JSON.stringify(answers)}

Recommend ${limit} careers. Return ONLY this JSON format:
{
  "recommendations": [
    {"career": "Software Engineer", "explanation": "Good for technical skills"},
    {"career": "Data Analyst", "explanation": "Good for analytical thinking"},
    {"career": "Project Manager", "explanation": "Good for leadership skills"}
  ]
}`;
    
    const data = await callGemini({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }, 'recommendations');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API listening on ' + port));