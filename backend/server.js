const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'testdb'
});

// Connect DB
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL');

    // Create table automatically
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content VARCHAR(255) NOT NULL
      )
    `;

    db.query(createTableQuery, (err) => {
      if (err) {
        console.error('Table creation failed:', err);
      } else {
        console.log('Messages table ready');
      }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Old API test
app.get('/api', (req, res) => {
  res.json({
    message: 'Backend is running'
  });
});

// GET all messages
app.get('/api/messages', (req, res) => {
  const query = 'SELECT * FROM messages ORDER BY id DESC';

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to fetch messages'
      });
    }

    res.json(results);
  });
});

// POST new message
app.post('/api/messages', (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      error: 'Content is required'
    });
  }

  const query = 'INSERT INTO messages (content) VALUES (?)';

  db.query(query, [content], (err, result) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to insert message'
      });
    }

    res.json({
      message: 'Message added successfully',
      id: result.insertId
    });
  });
});

app.listen(5000, () => {
  console.log('Backend running on port 5000');
});