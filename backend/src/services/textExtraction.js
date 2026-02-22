/**
 * INTENT: Extract text from uploaded documents (PDF, Word, plain text).
 * PDFs use async AWS Textract; Word docs use mammoth; text files are read directly.
 * Also handles ensuring extracted text is available in S3 (with DynamoDB migration).
 */

const { s3 } = require('../config/aws');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
const Document = require('../models/Document');
const {
  EXTRACTED_TEXT_BUCKET,
  resolveExtractedTextS3Key,
  putTextToS3,
  getTextFromS3,
} = require('./s3Storage');

const DOCUMENTS_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'legal-documents';
const REGION = 'us-east-1';

let textractClient = null;

function initializeTextractClient() {
  if (!textractClient) {
    textractClient = new TextractClient({ region: REGION });
  }
  return textractClient;
}

const SUPPORTED_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
];

function isAnalysisSupported(contentType) {
  return SUPPORTED_CONTENT_TYPES.some(type => contentType.includes(type.split('/')[1]));
}

/**
 * INTENT: Extract text from a document buffer based on its content type.
 * For PDFs: Uses async Textract to support multi-page documents.
 * For Word (.docx): Uses mammoth (lazy-loaded).
 * For text files: Direct buffer-to-string conversion.
 *
 * Input: buffer, contentType, fileName, s3Key (s3Key required for PDF Textract)
 * Output: extracted text string
 */
async function extractText(buffer, contentType, fileName, s3Key) {
  // Handle PDFs using AWS Textract async API (supports multi-page)
  if (contentType === 'application/pdf' || contentType.includes('pdf') || fileName.endsWith('.pdf')) {
    try {
      console.log(`Extracting text from PDF: ${fileName}, using async Textract`);
      const client = initializeTextractClient();

      const startResponse = await client.send(new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: { Bucket: DOCUMENTS_BUCKET, Name: s3Key },
        },
      }));
      const jobId = startResponse.JobId;
      console.log(`Textract job started: ${jobId}`);

      // Poll for completion (2-minute timeout, 1-second intervals)
      const maxAttempts = 120;
      let jobStatus = 'IN_PROGRESS';
      let attempts = 0;
      let textBlocks = [];

      while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const getResponse = await client.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
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

      const extractedText = textBlocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .join('\n');

      console.log(`Extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  // Handle Word documents (.docx)
  if (contentType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
    try {
      const mammoth = require('mammoth'); // lazy-load
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`Failed to extract text from Word document: ${error.message}`);
    }
  }

  // Handle text-based files
  if (
    contentType.includes('text') || contentType.includes('plain') ||
    contentType === 'application/json' || contentType === 'application/xml' ||
    fileName.match(/\.(txt|md|json|xml)$/i)
  ) {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${contentType}. Supported types: PDF, Word (.docx), and text files.`);
}

/**
 * INTENT: Ensure extracted text is available in S3 and return it.
 * 1) Uses existing S3 reference if present.
 * 2) Migrates legacy DynamoDB extractedText to S3 on first access.
 * 3) Fetches original document from S3 and extracts text if neither exists.
 *
 * Input: fileId, documentId, document record
 * Output: extracted text string
 */
async function ensureExtractedTextAvailable(fileId, documentId, document) {
  // 1) Already stored in S3
  if (document.extractedTextS3Key) {
    return await getTextFromS3(EXTRACTED_TEXT_BUCKET, document.extractedTextS3Key);
  }

  // 2) Legacy: extractedText stored in DynamoDB — migrate to S3
  if (document.extractedText && typeof document.extractedText === 'string' && document.extractedText.trim().length > 0) {
    const s3Key = resolveExtractedTextS3Key(fileId, documentId, document);
    await putTextToS3(EXTRACTED_TEXT_BUCKET, s3Key, document.extractedText);
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
  await putTextToS3(EXTRACTED_TEXT_BUCKET, extractedS3Key, extractedText);
  await Document.update(fileId, documentId, {
    extractedTextS3Key: extractedS3Key,
    extractedTextS3UpdatedAt: new Date().toISOString(),
    extractedText: null,
  });

  return extractedText;
}

module.exports = {
  SUPPORTED_CONTENT_TYPES,
  isAnalysisSupported,
  extractText,
  ensureExtractedTextAvailable,
};
