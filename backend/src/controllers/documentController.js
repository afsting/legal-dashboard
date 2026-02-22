/**
 * INTENT: HTTP route handlers for document operations.
 * All business logic (text extraction, S3 storage, conversation history,
 * Bedrock agent invocation) is delegated to the services layer.
 */

const path = require('path');
const { s3 } = require('../config/aws');
const { GetObjectCommand, PutObjectCommand, ListObjectVersionsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Document = require('../models/Document');
const FileNumber = require('../models/FileNumber');
const { EXTRACTED_TEXT_BUCKET, resolveExtractedTextS3Key, resolveAnalysisS3Key, putTextToS3, getTextFromS3 } = require('../services/s3Storage');
const { isAnalysisSupported, extractText, ensureExtractedTextAvailable } = require('../services/textExtraction');
const { loadConversationHistory, saveConversationHistory } = require('../services/conversationService');
const { isAgentConfigured, invokeAgent } = require('../services/bedrockService');

const DOCUMENTS_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'legal-documents';
const ANALYSIS_PREVIEW_CHARS = 500;

const sanitizeFileName = (fileName) => {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * INTENT: Parse the structured JSON response from the Bedrock chat prompt.
 * Strips markdown code fences, finds the outermost {...}, and JSON.parses it.
 * Falls back gracefully to a plain-reply shape if parsing fails.
 */
function parseBedrockChatResponse(text) {
  try {
    const stripped = text.replace(/```json\n?|\n?```/g, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
  } catch {
    // fall through to default
  }
  return { reply: text, analysisUpdated: false, updatedAnalysis: null };
}

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

      const putResult = await s3.send(new PutObjectCommand({
        Bucket: DOCUMENTS_BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: { clientid: clientId, filenumber: fileNumber },
      }));

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

      const result = await s3.send(new ListObjectVersionsCommand({
        Bucket: DOCUMENTS_BUCKET,
        Prefix: document.s3Key,
      }));

      const versions = (result.Versions || [])
        .filter(version => version.Key === document.s3Key)
        .map(version => ({
          versionId: version.VersionId,
          isLatest: version.IsLatest,
          lastModified: version.LastModified,
          size: version.Size,
        }));

      res.json({ documentId: document.documentId, fileName: document.fileName, versions });
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
  },

  async getPresignedDownloadUrl(req, res) {
    try {
      const { fileId, documentId } = req.params;
      const document = await Document.getById(fileId, documentId);

      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: document.s3Key }),
        { expiresIn: 30 * 60 } // 30 minutes
      );

      res.json({ url: presignedUrl });
    } catch (error) {
      console.error('Get presigned download URL error:', error);
      res.status(500).json({ error: 'Failed to generate document URL' });
    }
  },

  async getConversationHistory(req, res) {
    try {
      const { fileId, documentId } = req.params;
      const document = await Document.getById(fileId, documentId);

      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const conversationHistory = await loadConversationHistory(fileId, documentId, document);
      res.json({ documentId, conversationHistory });
    } catch (error) {
      console.error('Get conversation history error:', error);
      res.status(500).json({ error: 'Failed to load conversation history' });
    }
  },

  async chatAboutDocument(req, res) {
    try {
      const { fileId, documentId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }

      const document = await Document.getById(fileId, documentId);
      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      let documentText;
      try {
        documentText = await ensureExtractedTextAvailable(fileId, documentId, document);
      } catch (extractError) {
        console.error('Error loading/extracting text for chat:', extractError);
        return res.status(400).json({
          error: 'Cannot extract document text',
          message: 'Unable to extract text from document for chat.',
        });
      }

      if (!isAgentConfigured()) {
        return res.status(503).json({
          error: 'AI chat not available',
          message: 'Bedrock agent not configured',
        });
      }

      // Load the full current analysis so the AI can update it if needed
      let currentAnalysis = 'No analysis has been performed yet.';
      if (document.analysisS3Key) {
        try {
          currentAnalysis = await getTextFromS3(EXTRACTED_TEXT_BUCKET, document.analysisS3Key);
        } catch {
          currentAnalysis = document.analysis || 'No analysis has been performed yet.';
        }
      } else if (document.analysis) {
        currentAnalysis = document.analysis;
      }

      const fileNumber = await FileNumber.getById(fileId);
      const legalContext = fileNumber?.description || null;
      const conversationHistory = await loadConversationHistory(fileId, documentId, document);

      const historyText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      let query = 'You are a legal document analyst assisting a legal professional.\n\n';
      if (legalContext) {
        query += `LEGAL MATTER CONTEXT: ${legalContext}\n\n`;
      }
      query += `CURRENT DOCUMENT ANALYSIS:\n${currentAnalysis}\n\n`;
      query += `DOCUMENT TEXT:\n${documentText}\n\n`;
      if (historyText) {
        query += `PREVIOUS CONVERSATION:\n${historyText}\n\n`;
      }
      query += `USER MESSAGE: ${message}\n\n`;
      query += 'Instructions:\n';
      query += '- Answer the user\'s message clearly and helpfully.\n';
      query += '- If the user provides corrections, identifies parties, adds factual details, or clarifies information about this specific document, incorporate those into an updated analysis.\n';
      query += '- Only incorporate what the user explicitly states. Do not infer or add unverified details.\n';
      query += '- If the user is only asking a question (not providing new document facts), do not update the analysis.\n\n';
      query += 'Respond ONLY with valid JSON (no markdown, no extra text):\n';
      query += '{"reply":"your response","analysisUpdated":true,"updatedAnalysis":"full updated analysis text"}\n';
      query += 'OR if no analysis update is needed:\n';
      query += '{"reply":"your response","analysisUpdated":false,"updatedAnalysis":null}';

      const rawResponse = await invokeAgent(query, `doc-chat-${fileId}-${documentId}`);
      const parsed = parseBedrockChatResponse(rawResponse);
      const assistantMessage = parsed.reply || rawResponse;

      // Persist analysis update if the AI incorporated new information
      if (parsed.analysisUpdated && parsed.updatedAnalysis) {
        const analysisS3Key = resolveAnalysisS3Key(fileId, documentId, document);
        await putTextToS3(EXTRACTED_TEXT_BUCKET, analysisS3Key, parsed.updatedAnalysis);
        const analysisPreview = parsed.updatedAnalysis.length > ANALYSIS_PREVIEW_CHARS
          ? `${parsed.updatedAnalysis.slice(0, ANALYSIS_PREVIEW_CHARS)}…`
          : parsed.updatedAnalysis;
        await Document.update(fileId, documentId, {
          analysis: analysisPreview,
          analysisS3Key,
          analysisS3UpdatedAt: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
        });
      }

      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() },
      ];

      await saveConversationHistory(fileId, documentId, document, updatedHistory);

      res.json({
        documentId,
        userMessage: message,
        assistantMessage,
        analysisUpdated: parsed.analysisUpdated || false,
        updatedAnalysis: parsed.analysisUpdated ? parsed.updatedAnalysis : null,
        conversationHistory: updatedHistory,
      });
    } catch (error) {
      console.error('Chat about document error:', error);
      res.status(500).json({ error: 'Failed to chat about document', details: error.message });
    }
  },

  async analyzeDocument(req, res) {
    try {
      const { fileId, documentId } = req.params;
      const document = await Document.getById(fileId, documentId);

      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (!isAnalysisSupported(document.contentType)) {
        return res.status(400).json({
          error: 'Unsupported document type',
          message: 'Only PDF, Word (.docx), and text files can be analyzed.',
        });
      }

      // Extract text from the original document in S3
      let documentText = '';
      try {
        const s3Response = await s3.send(new GetObjectCommand({
          Bucket: DOCUMENTS_BUCKET,
          Key: document.s3Key,
        }));
        const bodyBuffer = Buffer.from(await s3Response.Body.transformToByteArray());
        documentText = await extractText(bodyBuffer, document.contentType, document.fileName, document.s3Key);
      } catch (s3Error) {
        console.error('Error retrieving or parsing document from S3:', s3Error);
        const statusCode = s3Error.message.includes('not supported') || s3Error.message.includes('single-page')
          ? 400 : 500;
        return res.status(statusCode).json({
          error: 'Failed to retrieve document content',
          details: s3Error.message,
        });
      }

      // Store extracted text in S3
      const extractedS3Key = resolveExtractedTextS3Key(fileId, documentId, document);
      await putTextToS3(EXTRACTED_TEXT_BUCKET, extractedS3Key, documentText);

      // Write immediate text preview as placeholder analysis so the UI is not blank
      const extractedTextPreview = documentText.length > ANALYSIS_PREVIEW_CHARS
        ? `${documentText.slice(0, ANALYSIS_PREVIEW_CHARS)}…`
        : documentText;

      const updated = await Document.update(fileId, documentId, {
        extractedText: null,
        extractedTextS3Key: extractedS3Key,
        extractedTextS3UpdatedAt: new Date().toISOString(),
        analysis: extractedTextPreview,
        analysisS3Key: null,
        analyzedAt: new Date().toISOString(),
      });

      // Return immediately with the placeholder — Bedrock runs in the background
      res.json({
        documentId: updated.documentId,
        fileName: updated.fileName,
        analysis: updated.analysis,
        analyzedAt: updated.analyzedAt,
      });

      // Background Bedrock analysis (fire-and-forget)
      if (isAgentConfigured() && documentText.length < 100000) {
        setImmediate(async () => {
          try {
            const fileNumber = await FileNumber.getById(fileId);
            const legalContext = fileNumber?.description || null;

            let query = 'Please analyze the following document';
            if (legalContext) {
              query += ` in the context of this legal matter: ${legalContext}`;
            }
            query += `\n\nDocument Name: ${document.fileName}\n\nDocument Content:\n${documentText}`;

            const bedrockAnalysis = await invokeAgent(query, `doc-analysis-${Date.now()}`);

            const analysisSKey = resolveAnalysisS3Key(fileId, documentId, document);
            await putTextToS3(EXTRACTED_TEXT_BUCKET, analysisSKey, bedrockAnalysis);

            const analysisPreview = bedrockAnalysis.length > ANALYSIS_PREVIEW_CHARS
              ? `${bedrockAnalysis.slice(0, ANALYSIS_PREVIEW_CHARS)}…`
              : bedrockAnalysis;

            await Document.update(fileId, documentId, {
              analysis: analysisPreview,
              analysisS3Key: analysisSKey,
              analysisS3UpdatedAt: new Date().toISOString(),
              analyzedAt: new Date().toISOString(),
            });

            console.log('Background Bedrock analysis completed for document:', documentId);
          } catch (bedrockError) {
            console.error('Background Bedrock analysis error:', bedrockError);
          }
        });
      }
    } catch (error) {
      console.error('Analyze document error:', error);
      res.status(500).json({ error: 'Failed to analyze document', details: error.message });
    }
  },
};

module.exports = documentController;
