#!/usr/bin/env pwsh
# Deploy the AI infrastructure stack separately from the main application stack

Write-Host "Deploying Legal AI Stack (Bedrock Agent + OpenSearch)..." -ForegroundColor Cyan
Write-Host "This will take 10-15 minutes (OpenSearch Serverless provisioning)" -ForegroundColor Yellow
Write-Host ""

# Get the documents bucket name from the main stack
Write-Host "Retrieving documents bucket name from main stack..." -ForegroundColor Gray
$bucketName = aws cloudformation describe-stacks `
  --stack-name LegalDashboardStack `
  --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' `
  --output text

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($bucketName)) {
  Write-Host "Error: Could not retrieve documents bucket name from LegalDashboardStack" -ForegroundColor Red
  Write-Host "Make sure the main stack is deployed first." -ForegroundColor Red
  exit 1
}

Write-Host "Found documents bucket: $bucketName" -ForegroundColor Green
Write-Host ""

# Deploy AI stack
Write-Host "Deploying AI stack with CDK..." -ForegroundColor Cyan
cdk deploy LegalAiStack `
  --app "npx ts-node bin/ai-app.ts" `
  --context documentsBucketName=$bucketName `
  --require-approval never

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ AI Stack deployed successfully!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "1. Upload documents to S3 with metadata tags (clientId, fileNumberId)" -ForegroundColor White
  Write-Host "2. Sync the knowledge base: aws bedrock-agent start-ingestion-job ..." -ForegroundColor White
  Write-Host "3. Invoke the agent from your application" -ForegroundColor White
  Write-Host ""
  Write-Host "See the CloudFormation outputs for Agent ID and Knowledge Base ID" -ForegroundColor Gray
} else {
  Write-Host ""
  Write-Host "❌ Deployment failed" -ForegroundColor Red
  exit 1
}
