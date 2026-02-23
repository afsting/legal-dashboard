const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { adminMiddleware } = require('../middleware/auth');

// GET /api/settings/branding — public (no auth; needed before login for logo/firm name)
router.get('/branding', settingsController.getBranding);

// PUT /api/settings/branding — admin only
router.put('/branding', adminMiddleware, settingsController.updateBranding);

// POST /api/settings/branding/logo-upload — admin only; returns presigned S3 PUT URL
router.post('/branding/logo-upload', adminMiddleware, settingsController.getLogoUploadUrl);

// DELETE /api/settings/branding/logo — admin only
router.delete('/branding/logo', adminMiddleware, settingsController.removeLogo);

module.exports = router;
