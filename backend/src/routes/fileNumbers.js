const express = require('express');
const fileNumberController = require('../controllers/fileNumberController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new file number
router.post('/', fileNumberController.create);

// Get file numbers by client ID
router.get('/client/:clientId', fileNumberController.getByClientId);

// Get file numbers by package ID
router.get('/package/:packageId', fileNumberController.getByPackageId);

// Get a specific file number
router.get('/:fileId', fileNumberController.getById);

// Update a file number
router.put('/:fileId', fileNumberController.update);

// Delete a file number
router.delete('/:fileId', fileNumberController.delete);

module.exports = router;
