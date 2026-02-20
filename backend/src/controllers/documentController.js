const path = require('path');
const { s3 } = require('../config/aws');
const Document = require('../models/Document');

const DOCUMENTS_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'legal-documents';

const sanitizeFileName = (fileName) => {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
};

const documentController = {
  async upload(req, res) {
    try {
      const { fileId } = req.params;
      const { clientId, fileNumber } = req.body;
      const uploadedBy = req.user.userId;

      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      if (!clientId || !fileNumber) {
        return res.status(400).json({ error: 'clientId and fileNumber are required' });
      }

      const safeFileName = sanitizeFileName(req.file.originalname);
      const s3Key = `clients/${clientId}/file-numbers/${fileNumber}/docs/${safeFileName}`;

      const putResult = await s3.putObject({
        Bucket: DOCUMENTS_BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: {
          clientid: clientId,
          filenumber: fileNumber
        }
      }).promise();

      const existing = await Document.findByFileName(fileId, safeFileName);

      if (existing) {
        const updated = await Document.update(fileId, existing.documentId, {
          contentType: req.file.mimetype,
          size: req.file.size,
          latestVersionId: putResult.VersionId || existing.latestVersionId || null,
          uploadedBy,
        });
        return res.status(200).json(updated);
      }

      const document = await Document.create(fileId, {
        clientId,
        fileNumber,
        fileName: safeFileName,
        contentType: req.file.mimetype,
        size: req.file.size,
        s3Key,
        latestVersionId: putResult.VersionId || null,
        uploadedBy,
      });

      return res.status(201).json(document);
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  },

  async listByFileId(req, res) {
    try {
      const { fileId } = req.params;
      const documents = await Document.listByFileId(fileId);
      res.json(documents);
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  },

  async listVersions(req, res) {
    try {
      const { fileId, documentId } = req.params;
      const document = await Document.getById(fileId, documentId);

      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const result = await s3.listObjectVersions({
        Bucket: DOCUMENTS_BUCKET,
        Prefix: document.s3Key,
      }).promise();

      const versions = (result.Versions || [])
        .filter(version => version.Key === document.s3Key)
        .map(version => ({
          versionId: version.VersionId,
          isLatest: version.IsLatest,
          lastModified: version.LastModified,
          size: version.Size,
        }));

      res.json({
        documentId: document.documentId,
        fileName: document.fileName,
        versions,
      });
    } catch (error) {
      console.error('List document versions error:', error);
      res.status(500).json({ error: 'Failed to retrieve document versions' });
    }
  },

  async softDelete(req, res) {
    try {
      const { fileId, documentId } = req.params;
      const deletedBy = req.user.userId;
      const document = await Document.getById(fileId, documentId);

      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const updated = await Document.softDelete(fileId, documentId, deletedBy);
      res.json(updated);
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
};

module.exports = documentController;
