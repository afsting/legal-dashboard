# Legal AI Stack

Separate CDK stack for AI features (Bedrock Agent with Nova Pro + OpenSearch vector storage).

## Architecture

```
S3 Documents → Knowledge Base → OpenSearch Serverless (vectors)
                     ↓
              Bedrock Agent (Nova Pro)
                     ↓
              API responses with citations
```

## Features

- **Bedrock Agent**: Uses Amazon Nova Pro model
- **Knowledge Base**: Automatically syncs from S3 documents bucket
- **Vector Storage**: OpenSearch Serverless with metadata filtering
- **Metadata Isolation**: Query only specific `fileNumberId` to prevent conflation

## Deployment

### Prerequisites

1. Main `LegalDashboardStack` must be deployed first
2. Bedrock model access enabled in your AWS account:
   ```powershell
   # Check if Nova Pro is available
   aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?modelId==`amazon.nova-pro-v1:0`]'
   
   # Request access if needed (AWS Console)
   # https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
   ```

### Deploy AI Stack

```powershell
cd infrastructure
.\scripts\deploy-ai.ps1
```

**Time**: 10-15 minutes (OpenSearch Serverless provisioning)

### Outputs

After deployment, you'll get:
- `AgentId` - Bedrock agent identifier
- `AgentAliasId` - Use this for invocations
- `KnowledgeBaseId` - For syncing documents
- `DataSourceId` - For ingestion jobs
- `VectorCollectionEndpoint` - OpenSearch endpoint

## Usage

### 1. Upload Documents with Metadata

When uploading to S3, add metadata tags:

```javascript
const uploadParams = {
  Bucket: 'legal-documents-...',
  Key: `${clientId}/${fileNumberId}/document.pdf`,
  Body: fileBuffer,
  Metadata: {
    'clientId': clientId,
    'fileNumberId': fileNumberId,
    'packageId': packageId,
    'documentType': 'police-report'
  }
};
```

### 2. Sync Knowledge Base

After uploading documents, trigger ingestion:

```powershell
# Get IDs from CloudFormation outputs
$kbId = aws cloudformation describe-stacks --stack-name LegalAiStack --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' --output text
$dsId = aws cloudformation describe-stacks --stack-name LegalAiStack --query 'Stacks[0].Outputs[?OutputKey==`DataSourceId`].OutputValue' --output text

# Start ingestion job
aws bedrock-agent start-ingestion-job `
  --knowledge-base-id $kbId `
  --data-source-id $dsId
```

### 3. Invoke Agent

```javascript
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({ region: 'us-east-1' });

const response = await client.send(new InvokeAgentCommand({
  agentId: 'YOUR_AGENT_ID',
  agentAliasId: 'YOUR_AGENT_ALIAS_ID',
  sessionId: `session-${fileNumberId}`,
  inputText: 'What was the accident date according to the police report?',
  sessionState: {
    knowledgeBaseConfigurations: [{
      knowledgeBaseId: 'YOUR_KB_ID',
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          filter: {
            equals: {
              key: 'fileNumberId',
              value: fileNumberId  // Isolates to specific file number!
            }
          }
        }
      }
    }]
  }
}));
```

## Cost Estimate

- **OpenSearch Serverless**: ~$700/month (always-on collection) or ~$0.24/OCU-hour
- **Bedrock Nova Pro**: ~$0.80 per 1M input tokens, ~$3.20 per 1M output tokens
- **Bedrock Knowledge Base**: ~$0.10 per 1000 documents indexed
- **Vector Storage**: Included in OpenSearch Serverless cost

**Tip**: Use on-demand OCU for dev/test to reduce costs

## Destroy Stack

```powershell
.\scripts\destroy-ai.ps1
```

This **only** destroys AI resources. Your main application is unaffected.

## Separation Benefits

✅ Deploy AI independently from main app  
✅ No risk to production application  
✅ Easy to enable/disable AI features  
✅ Faster iteration on AI components  
✅ Clear cost attribution  
✅ Can destroy and recreate without touching app  

## Troubleshooting

**OpenSearch provisioning fails**:
- Check service quotas (1 collection per account by default)
- Verify region supports OpenSearch Serverless

**Agent invocation fails**:
- Ensure model access is granted in Bedrock console
- Check IAM role permissions
- Verify knowledge base sync completed

**No documents returned**:
- Verify metadata tags match filter
- Check ingestion job status
- Confirm S3 bucket permissions

## Next Steps

1. **Backend API**: Add `/api/ai/chat` endpoint
2. **Frontend**: Create chat component in `FileNumberDetailPage`
3. **Streaming**: Implement streaming responses for better UX
4. **Caching**: Cache common queries to reduce costs
