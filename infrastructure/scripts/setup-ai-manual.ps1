#!/usr/bin/env pwsh
# Complete Bedrock AI Setup Script
# This one-time script creates all necessary AWS resources

Write-Host "=== Legal Dashboard AI Setup ===" -ForegroundColor Cyan
Write-Host "Creating OpenSearch + Bedrock Infrastructure..."
Write-Host ""

# Get account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "Account ID: $ACCOUNT_ID" -ForegroundColor Gray
Write-Host ""

# ===== Step 1: OpenSearch Serverless =====
Write-Host "Step 1: Creating OpenSearch Serverless Collection" -ForegroundColor Yellow

# 1a. Network Security Policy
Write-Host "  1a. Creating network security policy..." -ForegroundColor Gray
$networkPolicy = @{
    Rules = @(
        @{
            ResourceType = "collection"
            Resource = @("collection/legal-docs-vectors")
        }
    )
    AllowFromPublic = $true
} | ConvertTo-Json -Compress

aws opensearchserverless create-security-policy `
  --name 'legal-docs-network' `
  --type 'network' `
  --policy $networkPolicy 2>&1 | Select-String -Pattern 'securityPolicy|error' | ForEach-Object { Write-Host "     $_" }

Start-Sleep -Seconds 2

# 1b. Encryption Security Policy
Write-Host "  1b. Creating encryption security policy..." -ForegroundColor Gray
$encryptionPolicy = @{
    Rules = @(
        @{
            ResourceType = "collection"
            Resource = @("collection/legal-docs-vectors")
        }
    )
    AWSOwnedKey = $true
} | ConvertTo-Json -Compress

aws opensearchserverless create-security-policy `
  --name 'legal-docs-encryption' `
  --type 'encryption' `
  --policy $encryptionPolicy 2>&1 | Select-String -Pattern 'securityPolicy|error' | ForEach-Object { Write-Host "     $_" }

Start-Sleep -Seconds 2

# 1c. Data Access Policy (will create role first)
Write-Host "  1c. Creating data access policy..." -ForegroundColor Gray

# Create the KB role first so we can reference it
Write-Host "     Creating IAM role for Knowledge Base..." -ForegroundColor Gray

$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{ Service = "bedrock.amazonaws.com" }
            Action = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 2

aws iam create-role `
  --role-name BedrockKnowledgeBaseRole `
  --assume-role-policy-document $trustPolicy `
  --description 'Role for Bedrock Knowledge Base' 2>&1 | Select-String -Pattern 'Role|error' | Select-Object -First 1 | ForEach-Object { Write-Host "     $_" }

Start-Sleep -Seconds 2

$KB_ROLE_ARN = "arn:aws:iam::$ACCOUNT_ID:role/BedrockKnowledgeBaseRole"

$dataAccessPolicy = @{
    Rules = @(
        @{
            ResourceType = "index"
            Resource = @("index/legal-docs-vectors/*")
            Permission = @(
                "aoss:CreateIndex",
                "aoss:UpdateIndex",
                "aoss:DescribeIndex",
                "aoss:ReadDocument",
                "aoss:WriteDocument"
            )
        },
        @{
            ResourceType = "collection"
            Resource = @("collection/legal-docs-vectors")
            Permission = @("aoss:CreateCollectionItems", "aoss:DescribeCollectionItems")
        }
    )
    Principal = @($KB_ROLE_ARN)
} | ConvertTo-Json -Depth 3 -Compress

aws opensearchserverless create-access-policy `
  --name 'legal-docs-data-access' `
  --type 'data' `
  --policy $dataAccessPolicy 2>&1 | Select-String -Pattern 'accessPolicy|error' | ForEach-Object { Write-Host "     $_" }

Start-Sleep -Seconds 2

# 1d. Create Collection (takes ~5 minutes)
Write-Host "  1d. Creating OpenSearch Serverless collection (this may take 5-7 minutes)..." -ForegroundColor Gray
aws opensearchserverless create-collection `
  --name 'legal-docs-vectors' `
  --type 'VECTORSEARCH' `
  --description 'Vector storage for legal documents' 2>&1 | Select-String -Pattern 'collection|error' | Select-Object -First 1 | ForEach-Object { Write-Host "     $_" }

# Wait for collection to be active
Write-Host "  Waiting for collection to become active..." -ForegroundColor Gray
$collectionEndpoint = ""
$maxWait = 360  # 6 minutes
$waited = 0
while ([string]::IsNullOrEmpty($collectionEndpoint) -and $waited -lt $maxWait) {
  Start-Sleep -Seconds 10
  $collections = aws opensearchserverless list-collections `
    --query "collectionSummaries[?name=='legal-docs-vectors']" `
    --output json | ConvertFrom-Json
  
  if ($collections -and $collections[0].collectionEndpoint) {
    $collectionEndpoint = $collections[0].collectionEndpoint
  }
  
  $waited += 10
  $progress = [Math]::Round($waited / $maxWait * 100)
  Write-Host "     [$progress%] Waiting $(360-$waited) more seconds..." -ForegroundColor Gray
}

if ([string]::IsNullOrEmpty($collectionEndpoint)) {
  Write-Host "  ❌ Collection failed to activate" -ForegroundColor Red
  exit 1
}

Write-Host "  ✅ Collection created: $collectionEndpoint" -ForegroundColor Green
$COLLECTION_ARN = aws opensearchserverless describe-collections `
  --query "collectionDetails[?name=='legal-docs-vectors'].arn" `
  --output text
Write-Host "     ARN: $COLLECTION_ARN" -ForegroundColor Gray
Write-Host ""

# ===== Step 2: IAM Roles =====
Write-Host "Step 2: Creating IAM Roles" -ForegroundColor Yellow

# KB role already created above

# Add inline policy to KB role
Write-Host "  2a. Adding permissions to Knowledge Base role..." -ForegroundColor Gray
$kbPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @("s3:GetObject", "s3:ListBucket")
            Resource = @(
                "arn:aws:s3:::legal-documents-315326805073-us-east-1",
                "arn:aws:s3:::legal-documents-315326805073-us-east-1/*"
            )
        },
        @{
            Effect = "Allow"
            Action = @("aoss:APIAccessAll")
            Resource = "*"
        },
        @{
            Effect = "Allow"
            Action = @("bedrock:InvokeModel")
            Resource = "arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0"
        }
    )
} | ConvertTo-Json -Depth 3

aws iam put-role-policy `
  --role-name BedrockKnowledgeBaseRole `
  --policy-name BedrockKBPolicy `
  --policy-document $kbPolicy 2>&1 | Select-String -Pattern 'error' | ForEach-Object { Write-Host "     ❌ $_"; exit 1 }

Write-Host "  ✅ KB role configured" -ForegroundColor Green

# Create Agent role
Write-Host "  2b. Creating Agent role..." -ForegroundColor Gray
aws iam create-role `
  --role-name BedrockAgentRole `
  --assume-role-policy-document $trustPolicy `
  --description 'Role for Bedrock Agent' 2>&1 | Select-String -Pattern 'Role|error' | Select-Object -First 1 | ForEach-Object { Write-Host "     $_" }

$agentPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @("bedrock:InvokeModel")
            Resource = "arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0"
        },
        @{
            Effect = "Allow"
            Action = @("bedrock:Retrieve", "bedrock:RetrieveAndGenerate")
            Resource = "*"
        }
    )
} | ConvertTo-Json -Depth 2

aws iam put-role-policy `
  --role-name BedrockAgentRole `
  --policy-name BedrockAgentPolicy `
  --policy-document $agentPolicy

Write-Host "  ✅ Agent role created" -ForegroundColor Green
Write-Host ""

# ===== Step 3: Knowledge Base =====
Write-Host "Step 3: Creating Bedrock Knowledge Base" -ForegroundColor Yellow
Write-Host "  Creating knowledge base..." -ForegroundColor Gray

$kbOutput = aws bedrock-agent create-knowledge-base `
  --name 'legal-documents-kb' `
  --description 'Knowledge base for legal case documents' `
  --role-arn $KB_ROLE_ARN `
  --knowledge-base-configuration type=VECTOR,vectorKnowledgeBaseConfiguration='{embeddingModelArn=arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0}' `
  --storage-configuration "type=OPENSEARCH_SERVERLESS,opensearchServerlessConfiguration={collectionArn=$COLLECTION_ARN,vectorIndexName=bedrock-kb-default-index,fieldMapping={vectorField=vector,textField=text,metadataField=metadata}}" `
  --output json 2>&1

Write-Host $kbOutput | ConvertFrom-Json | Select-Object -ExpandProperty knowledgeBaseId | ForEach-Object { 
    $script:KB_ID = $_
    Write-Host "  ✅ Knowledge Base created: $_" -ForegroundColor Green 
}

if ([string]::IsNullOrEmpty($KB_ID)) {
    Write-Host "  ❌ Failed to create knowledge base" -ForegroundColor Red
    Write-Host "  Error: $kbOutput" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ===== Step 4: Data Source =====
Write-Host "Step 4: Creating Data Source" -ForegroundColor Yellow
Write-Host "  Creating S3 data source..." -ForegroundColor Gray

$dsOutput = aws bedrock-agent create-data-source `
  --knowledge-base-id $KB_ID `
  --name 'legal-documents-s3' `
  --description 'Documents from S3 bucket' `
  --data-source-configuration 'type=S3,s3Configuration={bucketArn=arn:aws:s3:::legal-documents-315326805073-us-east-1}' `
  --vector-ingestion-configuration 'chunkingConfiguration={chunkingStrategy=FIXED_SIZE,fixedSizeChunkingConfiguration={maxTokens=512,overlapPercentage=20}}' `
  --output json 2>&1

Write-Host $dsOutput | ConvertFrom-Json | Select-Object -ExpandProperty dataSourceId | ForEach-Object { 
    $script:DS_ID = $_
    Write-Host "  ✅ Data Source created: $_" -ForegroundColor Green 
}

Write-Host ""

# ===== Step 5: Bedrock Agent =====
Write-Host "Step 5: Creating Bedrock Agent" -ForegroundColor Yellow
Write-Host "  Creating agent with Nova Pro model..." -ForegroundColor Gray

$AGENT_ROLE_ARN = "arn:aws:iam::$ACCOUNT_ID:role/BedrockAgentRole"

$agentOutput = aws bedrock-agent create-agent `
  --agent-name 'legal-assistant' `
  --description 'AI assistant for legal case document analysis using Amazon Nova Pro' `
  --agent-resource-role-arn $AGENT_ROLE_ARN `
  --foundation-model 'amazon.nova-pro-v1:0' `
  --instruction 'You are a legal assistant helping lawyers analyze case documents. You have access to a knowledge base containing legal documents organized by client and file number. When answering questions: 1. Always cite the specific document name and file number, 2. Provide accurate quotes from source documents, 3. If information is not in the documents, say so clearly, 4. Be concise and professional.' `
  --idle-session-ttl-in-seconds 600 `
  --output json 2>&1

Write-Host $agentOutput | ConvertFrom-Json | Select-Object -ExpandProperty agentId | ForEach-Object { 
    $script:AGENT_ID = $_
    Write-Host "  ✅ Agent created: $_" -ForegroundColor Green 
}

if ([string]::IsNullOrEmpty($AGENT_ID)) {
    Write-Host "  ❌ Failed to create agent" -ForegroundColor Red
    Write-Host "  Error: $agentOutput" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ===== Step 6: Agent Alias =====
Write-Host "Step 6: Creating Agent Alias" -ForegroundColor Yellow
Write-Host "  Creating production alias..." -ForegroundColor Gray

# Need to wait a bit for agent to fully initialize
Start-Sleep -Seconds 5

$aliasOutput = aws bedrock-agent create-agent-alias `
  --agent-id $AGENT_ID `
  --agent-alias-name 'production' `
  --description 'Production agent alias' `
  --output json 2>&1

Write-Host $aliasOutput | ConvertFrom-Json | Select-Object -ExpandProperty agentAliasId | ForEach-Object { 
    $script:ALIAS_ID = $_
    Write-Host "  ✅ Agent Alias created: $_" -ForegroundColor Green 
}

Write-Host ""

# ===== Step 7: Start Knowledge Base Sync =====
Write-Host "Step 7: Starting Knowledge Base Ingestion" -ForegroundColor Yellow
Write-Host "  Starting document ingestion..." -ForegroundColor Gray

aws bedrock-agent start-ingestion-job `
  --knowledge-base-id $KB_ID `
  --data-source-id $DS_ID `
  --output json 2>&1 | ConvertFrom-Json | Select-Object ingestionJobId | ForEach-Object { 
    Write-Host "  ✅ Ingestion job started: $($_.ingestionJobId)" -ForegroundColor Green 
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Yellow
Write-Host "  Collection ARN:     $COLLECTION_ARN" -ForegroundColor Gray
Write-Host "  Knowledge Base ID:  $KB_ID" -ForegroundColor Gray
Write-Host "  Data Source ID:     $DS_ID" -ForegroundColor Gray
Write-Host "  Agent ID:           $AGENT_ID" -ForegroundColor Gray
Write-Host "  Agent Alias ID:     $ALIAS_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "Next: Save these IDs to your .env or configuration!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ingestion is in progress - documents will be indexed in a few minutes." -ForegroundColor Yellow
Write-Host "Check status with: aws bedrock-agent get-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID --ingestion-job-id <job-id>" -ForegroundColor Gray
