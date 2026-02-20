#!/usr/bin/env pwsh
# Destroy the AI infrastructure stack
# This does NOT affect your main application stack

Write-Host "⚠️  WARNING: This will destroy the AI infrastructure" -ForegroundColor Yellow
Write-Host "   - OpenSearch Serverless collection" -ForegroundColor Gray
Write-Host "   - Bedrock Knowledge Base" -ForegroundColor Gray
Write-Host "   - Bedrock Agent" -ForegroundColor Gray
Write-Host "   - All vector embeddings will be deleted" -ForegroundColor Gray
Write-Host ""
Write-Host "Your main application and documents will NOT be affected." -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "Type 'yes' to continue"

if ($confirmation -ne 'yes') {
  Write-Host "Cancelled" -ForegroundColor Gray
  exit 0
}

Write-Host ""
Write-Host "Destroying AI stack..." -ForegroundColor Red

cdk destroy LegalAiStack `
  --app "npx ts-node bin/ai-app.ts" `
  --force

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ AI Stack destroyed successfully" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "❌ Destruction failed" -ForegroundColor Red
  exit 1
}
