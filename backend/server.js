const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const client = require('prom-client');

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   PROMETHEUS METRICS SETUP
========================= */

// Create registry
const register = new client.Registry();

// Collect default Node.js metrics
client.collectDefaultMetrics({
  register
});

/* Counter -> total HTTP requests */
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

/* Histogram -> request duration */
const requestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

/* Gauge -> active requests */
const activeRequests = new client.Gauge({
  name: 'active_requests',
  help: 'Number of active requests'
});

/* Business Counter -> total messages created */
const messagesCreated = new client.Counter({
  name: 'messages_created_total',
  help: 'Total messages created'
});

/* Business Gauge -> current total messages */
const totalMessagesGauge = new client.Gauge({
  name: 'total_messages',
  help: 'Current total messages in database'
});

// Register custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(requestDuration);
register.registerMetric(activeRequests);
register.registerMetric(messagesCreated);
register.registerMetric(totalMessagesGauge);

/* =========================
   MYSQL CONNECTION
========================= */

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'testdb'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL');

    // Create messages table
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

        // Initialize total messages gauge
        updateTotalMessagesGauge();
      }
    });
  }
});

/* =========================
   HELPER FUNCTION
========================= */

function updateTotalMessagesGauge() {
  db.query(
    'SELECT COUNT(*) AS count FROM messages',
    (err, rows) => {
      if (!err) {
        totalMessagesGauge.set(rows[0].count);
      }
    }
  );
}

/* =========================
   METRICS MIDDLEWARE
========================= */

app.use((req, res, next) => {
  activeRequests.inc();

  const end = requestDuration.startTimer();

  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });

    end({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });

    activeRequests.dec();
  });

  next();
});

/* =========================
   ROUTES
========================= */

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Test API
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

    // Update gauge
    totalMessagesGauge.set(results.length);

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

    // Increment business metric
    messagesCreated.inc();

    // Update total message count
    updateTotalMessagesGauge();

    res.json({
      message: 'Message added successfully',
      id: result.insertId
    });
  });
});

/* =========================
   PROMETHEUS METRICS ENDPOINT
========================= */

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

/* =========================
   START SERVER
========================= */

app.listen(5000, () => {
  console.log('Backend running on port 5000');
});