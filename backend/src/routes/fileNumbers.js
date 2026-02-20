const express = require('express');
const multer = require('multer');
const fileNumberController = require('../controllers/fileNumberController');
const documentController = require('../controllers/documentController');
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }
});

// All routes require authentication
router.use(authMiddleware);

// Create a new file number
router.post('/', fileNumberController.create);

// Get presigned URL for direct S3 upload (for large files)
router.post('/:fileId/documents/presigned-url', uploadController.getPresignedUrl);

// Confirm upload after direct S3 upload
router.post('/:fileId/documents/confirm', uploadController.confirmUpload);

// Upload a document for a file number (legacy for small files)
router.post('/:fileId/documents', upload.single('file'), documentController.upload);

// Get file numbers by client ID
router.get('/client/:clientId', fileNumberController.getByClientId);

// Get file numbers by package ID
router.get('/package/:packageId', fileNumberController.getByPackageId);

// Get a specific file number
router.get('/:fileId', fileNumberController.getById);

// List documents for a file number
router.get('/:fileId/documents', documentController.listByFileId);

// List versions for a document
router.get('/:fileId/documents/:documentId/versions', documentController.listVersions);

// Soft delete a document
router.delete('/:fileId/documents/:documentId', documentController.softDelete);

// Update a file number
router.put('/:fileId', fileNumberController.update);

// Delete a file number
router.delete('/:fileId', fileNumberController.delete);

module.exports = router;
