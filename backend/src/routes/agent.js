const express = require('express');
const router = express.Router();
const { invokeAgent } = require('../controllers/agentController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/agent/query
router.post('/query', authMiddleware, invokeAgent);

module.exports = router;
