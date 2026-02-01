const express = require('express');
const workflowController = require('../controllers/workflowController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new workflow
router.post('/', workflowController.create);

// Get workflows by package ID
router.get('/package/:packageId', workflowController.getByPackageId);

// Get a specific workflow
router.get('/:workflowId', workflowController.getById);

// Update a workflow
router.put('/:workflowId', workflowController.update);

// Delete a workflow
router.delete('/:workflowId', workflowController.delete);

module.exports = router;
