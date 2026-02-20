const express = require('express');
const packageController = require('../controllers/packageController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new package
router.post('/', packageController.create);

// Get packages by client ID
router.get('/client/:clientId', packageController.getByClientId);

// Get packages by file number ID
router.get('/file-number/:fileNumberId', packageController.getByFileNumberId);

// Get a specific package
router.get('/:packageId', packageController.getById);

// Update a package
router.put('/:packageId', packageController.update);

// Delete a package
router.delete('/:packageId', packageController.delete);

module.exports = router;
