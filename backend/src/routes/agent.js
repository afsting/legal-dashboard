const express = require('express');
const router = express.Router();
const { invokeAgent, getJobStatus } = require('../controllers/agentController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/agent/query — start async job, returns { jobId, status: 'pending' }
router.post('/query', authMiddleware, invokeAgent);

// GET /api/agent/jobs/:jobId — poll for job status / result
router.get('/jobs/:jobId', authMiddleware, getJobStatus);

module.exports = router;
