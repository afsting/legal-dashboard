#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LegalAiStack } from '../lib/legal-ai-stack';

const app = new cdk.App();

// Get the documents bucket name from the main stack
// You can find this in the CloudFormation outputs or pass it as context
const documentsBucketName = app.node.tryGetContext('documentsBucketName') 
  || 'legal-documents-315326805073-us-east-1';

new LegalAiStack(app, 'LegalAiStack', {
  documentsBucketName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'AI infrastructure for Legal Dashboard - Bedrock Agent with Nova Pro and OpenSearch vector storage'
});
