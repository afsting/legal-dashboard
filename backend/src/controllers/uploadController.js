const { s3 } = require('../config/aws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DOCUMENTS_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'legal-documents';

const sanitizeFileName = (fileName) => {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
};

const uploadController = {
  async getPresignedUrl(req, res) {
    try {
      const { fileId } = req.params;
      const { fileName, contentType, clientId, fileNumber } = req.body;

      if (!fileName || !contentType || !clientId || !fileNumber) {
        return res.status(400).json({ 
          error: 'fileName, contentType, clientId, and fileNumber are required' 
        });
      }

      const safeFileName = sanitizeFileName(fileName);
      const s3Key = `clients/${clientId}/file-numbers/${fileNumber}/docs/${safeFileName}`;

      // Generate presigned URL that expires in 5 minutes
      const presignedUrl = await s3.getSignedUrlPromise('putObject', {
        Bucket: DOCUMENTS_BUCKET,
        Key: s3Key,
        ContentType: contentType,
        Expires: 300, // 5 minutes
      });

      res.json({
        uploadUrl: presignedUrl,
        s3Key,
        fileName: safeFileName,
      });
    } catch (error) {
      console.error('Get presigned URL error:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },

  async confirmUpload(req, res) {
    try {
      const { fileId } = req.params;
      const { documentId, fileName, contentType, size, s3Key, clientId, fileNumber } = req.body;
      const uploadedBy = req.user.userId;

      if (!fileName || !contentType || !size || !s3Key || !clientId || !fileNumber) {
        return res.status(400).json({ 
          error: 'All fields are required' 
        });
      }

      const Document = require('../models/Document');

      // Check if document with this filename already exists (versioning)
      const existing = await Document.findByFileName(fileId, fileName);

      if (existing) {
        // Get the version info from S3
        const headResult = await s3.headObject({
          Bucket: DOCUMENTS_BUCKET,
          Key: s3Key,
        }).promise();

        const updated = await Document.update(fileId, existing.documentId, {
          contentType,
          size,
          latestVersionId: headResult.VersionId || existing.latestVersionId || null,
          uploadedBy,
        });
        return res.status(200).json(updated);
      }

      // Create new document record
      const document = await Document.create(fileId, {
        documentId: documentId || uuidv4(),
        clientId,
        fileNumber,
        fileName,
        contentType,
        size,
        s3Key,
        latestVersionId: null,
        uploadedBy,
      });

      // Get version ID from S3
      const headResult = await s3.headObject({
        Bucket: DOCUMENTS_BUCKET,
        Key: s3Key,
      }).promise();

      if (headResult.VersionId) {
        await Document.update(fileId, document.documentId, {
          latestVersionId: headResult.VersionId,
        });
        document.latestVersionId = headResult.VersionId;
      }

      res.status(201).json(document);
    } catch (error) {
      console.error('Confirm upload error:', error);
      res.status(500).json({ error: 'Failed to confirm upload' });
    }
  },
};

module.exports = uploadController;
