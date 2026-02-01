const express = require('express');
const clientController = require('../controllers/clientController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new client
router.post('/', clientController.create);

// Get all clients for the authenticated user
router.get('/', clientController.getAll);

// Get a specific client
router.get('/:clientId', clientController.getById);

// Update a client
router.put('/:clientId', clientController.update);

// Delete a client
router.delete('/:clientId', clientController.delete);

module.exports = router;
