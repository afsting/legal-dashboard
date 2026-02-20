const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const packageRoutes = require('./routes/packages');
const fileNumberRoutes = require('./routes/fileNumbers');
const workflowRoutes = require('./routes/workflows');
const agentRoutes = require('./routes/agent');
const { authMiddleware } = require('./middleware/auth');

const app = express();

// Middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'https://d1bkh7cjshkl4w.cloudfront.net',
  'https://d1a0t4zzh748tj.cloudfront.net'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For preflight requests, still return success so browser can proceed
      if (origin && origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.post('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/file-numbers', fileNumberRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/agent', agentRoutes);

// Protected route example
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
