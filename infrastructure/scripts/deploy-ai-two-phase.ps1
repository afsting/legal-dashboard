#!/usr/bin/env pwsh
# Two-phase deployment to work around IAM propagation timing
# Phase 1: Deploy OpenSearch and IAM roles
# Phase 2: Deploy Knowledge Base and Agent

param(
    [switch]$SkipPhase1
)

Write-Host "=== Legal AI Stack Two-Phase Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Get the documents bucket name from the main stack
Write-Host "Retrieving documents bucket name from main stack..." -ForegroundColor Gray
$bucketName = aws cloudformation describe-stacks `
  --stack-name LegalDashboardStack `
  --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' `
  --output text

if ($LASTEXITCODE -ne 0 -or [string::IsNullOrEmpty($bucketName)) {
  Write-Host "Error: Could not retrieve documents bucket name" -ForegroundColor Red
  exit 1
}

Write-Host "Found documents bucket: $bucketName" -ForegroundColor Green
Write-Host ""

if (-not $SkipPhase1) {
  Write-Host "--- Phase 1: Deploying OpenSearch Collection and IAM Roles ---" -ForegroundColor Yellow
  Write-Host "This creates the vector store and sets up permissions" -ForegroundColor Gray
  Write-Host "Time: ~5-6 minutes" -ForegroundColor Gray
  Write-Host ""
  
  # Deploy with a parameter that skips knowledge base creation temporarily
  cdk deploy LegalAiStack `
    --app "npx ts-node bin/ai-app.ts" `
    --context documentsBucketName=$bucketName `
    --context phase=1 `
    --require-approval never
  
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Phase 1 failed" -ForegroundColor Red
    exit 1
  }
  
  Write-Host ""
  Write-Host "✅ Phase 1 complete - OpenSearch and roles deployed" -ForegroundColor Green
  Write-Host ""
  Write-Host "Waiting 60 seconds for IAM permissions to propagate..." -ForegroundColor Yellow
  Start-Sleep -Seconds 60
  Write-Host ""
}

Write-Host "--- Phase 2: Deploying Knowledge Base and Bedrock Agent ---" -ForegroundColor Yellow
Write-Host "This connects Bedrock to the vector store" -ForegroundColor Gray
Write-Host "Time: ~2-3 minutes" -ForegroundColor Gray
Write-Host ""

cdk deploy LegalAiStack `
  --app "npx ts-node bin/ai-app.ts" `
  --context documentsBucketName=$bucketName `
  --require-approval never

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅✅✅ AI Stack deployed successfully! ✅✅✅" -ForegroundColor Green
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "1. Upload documents with metadata (clientId, fileNumberId)" -ForegroundColor White
  Write-Host "2. Sync knowledge base: .\scripts\sync-knowledge-base.ps1" -ForegroundColor White
  Write-Host "3. Test the agent from your application" -ForegroundColor White
  Write-Host ""
} else {
  Write-Host ""
  Write-Host "❌ Phase 2 failed" -ForegroundColor Red
  Write-Host "Try running: .\scripts\deploy-ai-two-phase.ps1 -SkipPhase1" -ForegroundColor Yellow
  exit 1
}
