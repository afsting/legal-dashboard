/**
 * INTENT: Manage app-wide branding settings (firm name, logo, theme).
 * Settings JSON stored at settings/branding.json in the extracted-text S3 bucket.
 * Logo stored at settings/logo.{ext} in the same bucket (presigned GET for display).
 */

const { s3 } = require('../config/aws');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const SETTINGS_BUCKET = process.env.S3_BUCKET_EXTRACTED_TEXT;
const BRANDING_KEY = 'settings/branding.json';
const VALID_THEMES = ['purple', 'blue', 'green', 'navy', 'charcoal', 'crimson'];
const ALLOWED_IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

async function readBranding() {
  if (!SETTINGS_BUCKET) return {};
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: SETTINGS_BUCKET,
      Key: BRANDING_KEY,
    }));
    const body = await result.Body.transformToString();
    return JSON.parse(body);
  } catch (err) {
    if (err.name === 'NoSuchKey') return {};
    throw err;
  }
}

async function writeBranding(data) {
  await s3.send(new PutObjectCommand({
    Bucket: SETTINGS_BUCKET,
    Key: BRANDING_KEY,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}

const settingsController = {
  /**
   * GET /api/settings/branding — public (no auth required so login page can load branding)
   * Returns branding JSON with a presigned logo URL (7-day expiry).
   */
  async getBranding(req, res) {
    try {
      const branding = await readBranding();

      if (branding.logoKey && SETTINGS_BUCKET) {
        try {
          const command = new GetObjectCommand({
            Bucket: SETTINGS_BUCKET,
            Key: branding.logoKey,
          });
          branding.logoUrl = await getSignedUrl(s3, command, { expiresIn: 604800 });
        } catch {
          // Logo key may no longer exist — omit it
          delete branding.logoKey;
        }
      }

      res.json(branding);
    } catch (error) {
      console.error('Get branding error:', error);
      res.status(500).json({ error: 'Failed to load branding settings' });
    }
  },

  /**
   * PUT /api/settings/branding — admin only
   * Accepts { firmName?, theme? } and merges with existing settings.
   */
  async updateBranding(req, res) {
    try {
      const { firmName, theme } = req.body;
      const existing = await readBranding();
      const updated = { ...existing, updatedAt: new Date().toISOString() };

      if (firmName !== undefined) {
        updated.firmName = String(firmName).trim().slice(0, 100);
      }

      if (theme !== undefined) {
        if (!VALID_THEMES.includes(theme)) {
          return res.status(400).json({ error: `Invalid theme. Valid: ${VALID_THEMES.join(', ')}` });
        }
        updated.theme = theme;
      }

      await writeBranding(updated);
      res.json(updated);
    } catch (error) {
      console.error('Update branding error:', error);
      res.status(500).json({ error: 'Failed to update branding settings' });
    }
  },

  /**
   * POST /api/settings/branding/logo-upload — admin only
   * Returns a presigned PUT URL for direct S3 upload, then records the key.
   * Body: { contentType: 'image/png' }
   */
  async getLogoUploadUrl(req, res) {
    try {
      if (!SETTINGS_BUCKET) {
        return res.status(503).json({ error: 'Storage not configured (S3_BUCKET_EXTRACTED_TEXT)' });
      }

      const { contentType } = req.body;
      const ext = ALLOWED_IMAGE_TYPES[contentType];
      if (!ext) {
        return res.status(400).json({
          error: `Unsupported image type. Allowed: ${Object.keys(ALLOWED_IMAGE_TYPES).join(', ')}`,
        });
      }

      const logoKey = `settings/logo.${ext}`;
      const command = new PutObjectCommand({
        Bucket: SETTINGS_BUCKET,
        Key: logoKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

      // Persist the logo key so GET /branding returns it
      const existing = await readBranding();
      await writeBranding({ ...existing, logoKey });

      res.json({ uploadUrl, logoKey });
    } catch (error) {
      console.error('Logo upload URL error:', error);
      res.status(500).json({ error: 'Failed to generate logo upload URL' });
    }
  },

  /**
   * DELETE /api/settings/branding/logo — admin only
   * Removes the logoKey from branding settings (logo stops showing).
   */
  async removeLogo(req, res) {
    try {
      const existing = await readBranding();
      delete existing.logoKey;
      existing.updatedAt = new Date().toISOString();
      await writeBranding(existing);
      res.json(existing);
    } catch (error) {
      console.error('Remove logo error:', error);
      res.status(500).json({ error: 'Failed to remove logo' });
    }
  },
};

module.exports = settingsController;
