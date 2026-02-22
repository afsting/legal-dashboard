const path = require('path');
const zlib = require('zlib');
const { s3 } = require('../config/aws');
const { GetObjectCommand, PutObjectCommand, ListObjectVersionsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Document = require('../models/Document');
const FileNumber = require('../models/FileNumber');
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
// Lazy-load Word library to avoid initialization errors
// const mammoth = require('mammoth');

const DOCUMENTS_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'legal-documents';
const EXTRACTED_TEXT_BUCKET = process.env.S3_BUCKET_EXTRACTED_TEXT || null;
const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;
const REGION = 'us-east-1';

let bedrockAgentClient = null;
let textractClient = null;

function initializeAgentClient() {
  if (!bedrockAgentClient) {
    bedrockAgentClient = new BedrockAgentRuntimeClient({ region: REGION });
  }
  return bedrockAgentClient;
}

function initializeTextractClient() {
  if (!textractClient) {
    textractClient = new TextractClient({ region: REGION });
  }
  return textractClient;
}

/**
 * INTENT: Build stable S3 key for extracted text storage.
 * Mirrors the documents bucket convention: clients/{clientId}/file-numbers/{fileNumber}/...
 * Input: clientId, fileNumber (human-readable), documentId
 * Output: S3 key string
 */
function buildExtractedTextS3Key(clientId, fileNumber, documentId) {
  return `clients/${clientId}/file-numbers/${fileNumber}/extracted-text/${documentId}.txt.gz`;
}

/**
 * INTENT: Build stable S3 key for AI analysis storage.
 * Mirrors the documents bucket convention: clients/{clientId}/file-numbers/{fileNumber}/...
 * Input: clientId, fileNumber (human-readable), documentId
 * Output: S3 key string
 */
function buildAnalysisS3Key(clientId, fileNumber, documentId) {
  return `clients/${clientId}/file-numbers/${fileNumber}/analysis/${documentId}.txt.gz`;
}

/**
 * INTENT: Resolve the S3 key for extracted text, with fallback for legacy documents.
 * Uses the full client/file-number path when available; falls back to fileId-based path
 * for older documents that predate the clientId/fileNumber fields.
 * Input: fileId, documentId, document record
 * Output: S3 key string
 */
function resolveExtractedTextS3Key(fileId, documentId, document) {
  if (document.clientId && document.fileNumber) {
    return buildExtractedTextS3Key(document.clientId, document.fileNumber, documentId);
  }
  console.warn(`Document ${documentId} missing clientId/fileNumber — using fileId-based S3 key`);
  return `extracted-text/${fileId}/${documentId}.txt.gz`;
}

/**
 * INTENT: Resolve the S3 key for AI analysis, with fallback for legacy documents.
 * Input: fileId, documentId, document record
 * Output: S3 key string
 */
function resolveAnalysisS3Key(fileId, documentId, document) {
  if (document.clientId && document.fileNumber) {
    return buildAnalysisS3Key(document.clientId, document.fileNumber, documentId);
  }
  console.warn(`Document ${documentId} missing clientId/fileNumber — using fileId-based S3 key`);
  return `analysis/${fileId}/${documentId}.txt.gz`;
}

/**
 * INTENT: Build stable S3 key for conversation history storage.
 * Input: clientId, fileNumber (human-readable), documentId
 * Output: S3 key string
 */
function buildConversationHistoryS3Key(clientId, fileNumber, documentId) {
  return `clients/${clientId}/file-numbers/${fileNumber}/chat/${documentId}.json.gz`;
}

/**
 * INTENT: Resolve conversation history S3 key with fallback for legacy documents.
 * Input: fileId, documentId, document record
 * Output: S3 key string
 */
function resolveConversationHistoryS3Key(fileId, documentId, document) {
  if (document.clientId && document.fileNumber) {
    return buildConversationHistoryS3Key(document.clientId, document.fileNumber, documentId);
  }
  console.warn(`Document ${documentId} missing clientId/fileNumber — using fileId-based S3 key`);
  return `chat/${fileId}/${documentId}.json.gz`;
}

/**
 * INTENT: Load conversation history from S3, with migration from legacy DynamoDB storage.
 * Input: fileId, documentId, document record
 * Output: array of {role, content, timestamp} messages
 */
async function loadConversationHistory(fileId, documentId, document) {
  // 1) Already stored in S3
  if (document.conversationHistoryS3Key) {
    const json = await getTextFromS3(EXTRACTED_TEXT_BUCKET, document.conversationHistoryS3Key);
    return JSON.parse(json);
  }

  // 2) Legacy: history stored in DynamoDB — migrate to S3
  if (Array.isArray(document.conversationHistory) && document.conversationHistory.length > 0) {
    const s3Key = resolveConversationHistoryS3Key(fileId, documentId, document);
    await putTextToS3(EXTRACTED_TEXT_BUCKET, s3Key, JSON.stringify(document.conversationHistory));
    await Document.update(fileId, documentId, {
      conversationHistoryS3Key: s3Key,
      conversationHistoryUpdatedAt: new Date().toISOString(),
      conversationHistory: null,
    });
    return document.conversationHistory;
  }

  // 3) No history yet
  return [];
}

/**
 * INTENT: Persist conversation history to S3 and update the DynamoDB S3 key reference.
 * Clears the legacy DynamoDB conversationHistory array if present.
 * Input: fileId, documentId, document record, history array
 * Output: s3Key string
 */
async function saveConversationHistory(fileId, documentId, document, history) {
  const s3Key = document.conversationHistoryS3Key
    || resolveConversationHistoryS3Key(fileId, documentId, document);
  await putTextToS3(EXTRACTED_TEXT_BUCKET, s3Key, JSON.stringify(history));
  await Document.update(fileId, documentId, {
    conversationHistoryS3Key: s3Key,
    conversationHistoryUpdatedAt: new Date().toISOString(),
    conversationHistory: null,
  });
  return s3Key;
}

/**
 * INTENT: Store text content to S3 (gzipped). Used for both extracted text and AI analysis.
 * Input: bucket, key, text
 * Output: { key, bytes }
 */
async function putTextToS3(bucket, key, text) {
  if (!bucket) {
    throw new Error('Extracted text bucket is not configured (S3_BUCKET_EXTRACTED_TEXT)');
  }

  const gzippedBody = zlib.gzipSync(Buffer.from(text || '', 'utf-8'));

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: gzippedBody,
    ContentType: 'text/plain; charset=utf-8',
    ContentEncoding: 'gzip',
  }));

  return { key, bytes: gzippedBody.length };
}

/**
 * INTENT: Load text content from S3 (supports gzipped content). Used for both extracted text and AI analysis.
 * Input: bucket, key
 * Output: text string
 */
async function getTextFromS3(bucket, key) {
  if (!bucket) {
    throw new Error('Extracted text bucket is not configured (S3_BUCKET_EXTRACTED_TEXT)');
  }
  if (!key) {
    throw new Error('Missing S3 key');
  }

  const s3Response = await s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }));

  const bodyBuffer = Buffer.from(await s3Response.Body.transformToByteArray());

  const isGzipped = s3Response.ContentEncoding === 'gzip' || key.endsWith('.gz');
  return isGzipped
    ? zlib.gunzipSync(bodyBuffer).toString('utf-8')
    : bodyBuffer.toString('utf-8');
}

// Aliases for backwards-compatibility within this file
const putExtractedTextToS3 = (bucket, key, text) => putTextToS3(bucket, key, text);
const getExtractedTextFromS3 = (bucket, key) => getTextFromS3(bucket, key);

/**
 * INTENT: Ensure extracted text exists in S3 and return it.
 * - Uses existing S3 ref if present
 * - Migrates legacy DynamoDB extractedText into S3
 * - Otherwise extracts from original document in documents bucket
 */
async function ensureExtractedTextAvailable(fileId, documentId, document) {
  // 1) Already stored in S3
  if (document.extractedTextS3Key) {
    return await getExtractedTextFromS3(EXTRACTED_TEXT_BUCKET, document.extractedTextS3Key);
  }

  // 2) Legacy: extractedText stored in DynamoDB
  if (document.extractedText && typeof document.extractedText === 'string' && document.extractedText.trim().length > 0) {
    const s3Key = resolveExtractedTextS3Key(fileId, documentId, document);
    await putExtractedTextToS3(EXTRACTED_TEXT_BUCKET, s3Key, document.extractedText);

    await Document.update(fileId, documentId, {
      extractedTextS3Key: s3Key,
      extractedTextS3UpdatedAt: new Date().toISOString(),
      extractedText: null,
    });

    return document.extractedText;
  }

  // 3) Extract from original file in documents bucket
  const originalS3 = await s3.send(new GetObjectCommand({
    Bucket: DOCUMENTS_BUCKET,
    Key: document.s3Key,
  }));

  const bodyBuffer = Buffer.from(await originalS3.Body.transformToByteArray());
  const extractedText = await extractText(bodyBuffer, document.contentType, document.fileName, document.s3Key);
  const extractedS3Key = resolveExtractedTextS3Key(fileId, documentId, document);

  await putExtractedTextToS3(EXTRACTED_TEXT_BUCKET, extractedS3Key, extractedText);
  await Document.update(fileId, documentId, {
    extractedTextS3Key: extractedS3Key,
    extractedTextS3UpdatedAt: new Date().toISOString(),
    extractedText: null,
  });

  return extractedText;
}

/**
 * Supported content types for document analysis
 */
const SUPPORTED_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
];

/**
 * Check if content type is supported for analysis
 * @param {string} contentType - MIME type
 * @returns {boolean}
 */
function isAnalysisSupported(contentType) {
  return SUPPORTED_CONTENT_TYPES.some(type => contentType.includes(type.split('/')[1]));
}

/**
 * Extract text from document based on content type
 * For PDFs: Uses async Textract to support multi-page documents
 * For Word/Text: Uses synchronous extraction
 *
 * @param {Buffer} buffer - Document buffer from S3
 * @param {string} contentType - MIME type of document
 * @param {string} fileName - Original file name for extension fallback
 * @param {string} s3Key - S3 key for async Textract (PDFs only)
 * @returns {Promise<string>} Extracted text
 */
async function extractText(buffer, contentType, fileName, s3Key) {
  // Handle PDFs using AWS Textract async API (supports multi-page)
  if (contentType === 'application/pdf' || contentType.includes('pdf') || fileName.endsWith('.pdf')) {
    try {
      console.log(`Extracting text from PDF: ${fileName}, using async Textract`);

      const client = initializeTextractClient();

      // Start async text detection job
      console.log(`Starting Textract job for S3 document: ${s3Key}`);
      const startCommand = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: DOCUMENTS_BUCKET,
            Name: s3Key,
          },
        },
      });

      const startResponse = await client.send(startCommand);
      const jobId = startResponse.JobId;
      console.log(`Textract job started: ${jobId}`);

      // Poll for job completion (with timeout)
      const maxAttempts = 120; // 2 minutes (1 second per attempt)
      let jobStatus = 'IN_PROGRESS';
      let attempts = 0;
      let textBlocks = [];

      while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;

        const getCommand = new GetDocumentTextDetectionCommand({
          JobId: jobId,
        });

        const getResponse = await client.send(getCommand);
        jobStatus = getResponse.JobStatus;

        if (getResponse.Blocks) {
          textBlocks = getResponse.Blocks;
        }

        console.log(`Textract job status: ${jobStatus} (attempt ${attempts})`);
      }

      if (jobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${startResponse.StatusMessage || 'Unknown error'}`);
      }

      if (jobStatus === 'IN_PROGRESS') {
        throw new Error('Document analysis timeout - extraction is taking too long. Please try again.');
      }

      if (!textBlocks || textBlocks.length === 0) {
        throw new Error('No text found in PDF. The document may be an image-only scan without text layer.');
      }

      // Extract text from Textract blocks
      const extractedText = textBlocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .join('\n');

      console.log(`Extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    } catch (error) {
      console.error(`PDF extraction error:`, error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  // Handle Word documents (.docx)
  if (contentType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
    try {
      // Lazy-load mammoth only when needed
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`Failed to extract text from Word document: ${error.message}`);
    }
  }

  // Handle text-based files
  if (contentType.includes('text') || contentType.includes('plain') ||
      contentType === 'application/json' || contentType === 'application/xml' ||
      fileName.match(/\.(txt|md|json|xml)$/i)) {
    return buffer.toString('utf-8');
  }

  // Unsupported file type
  throw new Error(`Unsupported file type: ${contentType}. Supported types: PDF, Word (.docx), and text files.`);
}

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

      const putResult = await s3.send(new PutObjectCommand({
        Bucket: DOCUMENTS_BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: {
          clientid: clientId,
          filenumber: fileNumber
        }
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

      // Load full document text (stored in S3) for chat context.
      let documentText;
      try {
        documentText = await ensureExtractedTextAvailable(fileId, documentId, document);
      } catch (extractError) {
        console.error('Error loading/extracting text for chat:', extractError);
        return res.status(400).json({
          error: 'Cannot extract document text',
          message: 'Unable to extract text from document for chat.'
        });
      }

      // Skip chat if no agent configured
      if (!AGENT_ID || !AGENT_ALIAS_ID) {
        return res.status(503).json({
          error: 'AI chat not available',
          message: 'Bedrock agent not configured'
        });
      }

      // Build conversation context with extracted text
      const fileNumber = await FileNumber.getById(fileId);
      const legalContext = fileNumber?.description || null;

      // Load conversation history from S3 (migrates from DynamoDB if legacy)
      const conversationHistory = await loadConversationHistory(fileId, documentId, document);
      const historyText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Build query for agent with full context
      let query = `You are assisting a legal professional review a document. `;
      query += `You have access to the full document text below. `;
      if (legalContext) {
        query += `This is for the following legal matter: ${legalContext}. `;
      }

      if (historyText) {
        query += `\n\nPrevious conversation:\n${historyText}\n\n`;
      }

      query += `\n\nDocument Name: ${document.fileName}\n`;
      query += `Document Content:\n${documentText}\n\n`;
      query += `User's current question: ${message}`;

      // Invoke Bedrock agent
      const client = initializeAgentClient();
      const command = new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId: `doc-chat-${fileId}-${documentId}`,
        inputText: query,
      });

      const response = await client.send(command);

      // Consume stream
      const chunks = [];
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk?.bytes) {
            chunks.push(Buffer.from(event.chunk.bytes).toString('utf-8'));
          }
        }
      }

      const assistantMessage = chunks.join('');

      // Save conversation history to S3
      const updatedHistory = [
        ...conversationHistory,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: assistantMessage,
          timestamp: new Date().toISOString(),
        },
      ];

      await saveConversationHistory(fileId, documentId, document, updatedHistory);

      res.json({
        documentId,
        userMessage: message,
        assistantMessage,
        conversationHistory: updatedHistory,
      });
    } catch (error) {
      console.error('Chat about document error:', error);
      res.status(500).json({ error: 'Failed to chat about document', details: error.message });
    }  },

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

  async analyzeDocument(req, res) {
    try {
      const { fileId, documentId } = req.params;

      // Get the document
      const document = await Document.getById(fileId, documentId);
      if (!document || document.deletedAt) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if document type is supported
      if (!isAnalysisSupported(document.contentType)) {
        return res.status(400).json({
          error: 'Unsupported document type',
          message: 'Only PDF, Word (.docx), and text files can be analyzed. Images require OCR processing.'
        });
      }

      // Retrieve document content from S3 and extract text
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
        // Return 400 for unsupported formats, 500 for other errors
        const statusCode = s3Error.message.includes('not supported') || s3Error.message.includes('single-page')
          ? 400
          : 500;
        return res.status(statusCode).json({
          error: 'Failed to retrieve document content',
          details: s3Error.message
        });
      }

      // Store extracted text in S3 (not DynamoDB) to avoid DynamoDB 400KB item limit.
      const extractedS3Key = resolveExtractedTextS3Key(fileId, documentId, document);
      await putTextToS3(EXTRACTED_TEXT_BUCKET, extractedS3Key, documentText);

      // Store an immediate preview from extracted text so the UI is not blank while
      // the background Bedrock job runs. The background job will overwrite this with
      // a proper AI-generated summary when it completes.
      const ANALYSIS_PREVIEW_CHARS = 500;
      const extractedTextPreview = documentText.length > ANALYSIS_PREVIEW_CHARS
        ? `${documentText.slice(0, ANALYSIS_PREVIEW_CHARS)}…`
        : documentText;

      const updated = await Document.update(fileId, documentId, {
        extractedText: null,
        extractedTextS3Key: extractedS3Key,
        extractedTextS3UpdatedAt: new Date().toISOString(),
        analysis: extractedTextPreview,  // Immediate placeholder; replaced by Bedrock job
        analysisS3Key: null,
        analyzedAt: new Date().toISOString(),
      });

      // Return response immediately (< 2 seconds), including the placeholder preview
      res.json({
        documentId: updated.documentId,
        fileName: updated.fileName,
        analysis: updated.analysis,
        analyzedAt: updated.analyzedAt,
      });

      // Optional: Invoke Bedrock agent asynchronously in background (fire and forget)
      // This won't block the HTTP response but can enhance analysis results later
      if (AGENT_ID && AGENT_ALIAS_ID && documentText.length < 100000) {
        setImmediate(async () => {
          try {
            const fileNumber = await FileNumber.getById(fileId);
            const legalContext = fileNumber?.description || null;

            // Build query for agent
            let query = `Please analyze the following document`;
            if (legalContext) {
              query += ` in the context of this legal matter: ${legalContext}`;
            }
            query += `\n\nDocument Name: ${document.fileName}\n\nDocument Content:\n${documentText}`;

            // Invoke Bedrock agent
            const client = initializeAgentClient();
            const command = new InvokeAgentCommand({
              agentId: AGENT_ID,
              agentAliasId: AGENT_ALIAS_ID,
              sessionId: `doc-analysis-${Date.now()}`,
              inputText: query,
            });

            const response = await client.send(command);

            // Consume stream
            const chunks = [];
            if (response.completion) {
              for await (const event of response.completion) {
                if (event.chunk?.bytes) {
                  chunks.push(Buffer.from(event.chunk.bytes).toString('utf-8'));
                }
              }
            }

            const bedrockAnalysis = chunks.join('');

            // Store full AI analysis in S3, keep a short preview in DynamoDB.
            const analysisSKey = resolveAnalysisS3Key(fileId, documentId, document);
            await putTextToS3(EXTRACTED_TEXT_BUCKET, analysisSKey, bedrockAnalysis);

            const ANALYSIS_PREVIEW_CHARS = 500;
            const analysisPreview = bedrockAnalysis.length > ANALYSIS_PREVIEW_CHARS
              ? `${bedrockAnalysis.slice(0, ANALYSIS_PREVIEW_CHARS)}…`
              : bedrockAnalysis;

            // Update document with S3 reference and preview
            await Document.update(fileId, documentId, {
              analysis: analysisPreview,
              analysisS3Key: analysisSKey,
              analysisS3UpdatedAt: new Date().toISOString(),
              analyzedAt: new Date().toISOString(),
            });

            console.log('Background Bedrock analysis completed for document:', documentId);
          } catch (bedrockError) {
            console.error('Background Bedrock analysis error:', bedrockError);
            // Silently fail - document already has extracted text
          }
        });
      }
    } catch (error) {
      console.error('Analyze document error:', error);
      res.status(500).json({ error: 'Failed to analyze document', details: error.message });
    }
  }
};

module.exports = documentController;
