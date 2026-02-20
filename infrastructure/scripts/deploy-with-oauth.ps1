# Deploy script that reads OAuth credentials from .env.local
# This script loads environment variables and passes them to CDK deploy

param(
    [switch]$Destroy,
    [switch]$DryRun
)

# Load .env.local file
$infraDir = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $infraDir ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Error ".env.local not found at $envFile"
    Write-Host "Please copy .env.example to .env.local and fill in your OAuth credentials"
    exit 1
}

Write-Host "Loading environment variables from .env.local..." -ForegroundColor Cyan

# Parse .env.local file
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_
    if ($line -match '^\s*#' -or $line -match '^\s*$') {
        return  # Skip comments and empty lines
    }
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
        Write-Host "  OK $key" -ForegroundColor Green
    }
}

# Build CDK deploy command with context variables
$cdkArgs = @('deploy', '--all', '--require-approval', 'never')

# Add context variables from environment file
if ($envVars['GOOGLE_CLIENT_ID'] -and $envVars['GOOGLE_CLIENT_SECRET']) {
    $cdkArgs += '-c'
    $cdkArgs += "googleClientId=$($envVars['GOOGLE_CLIENT_ID'])"
    $cdkArgs += '-c'
    $cdkArgs += "googleClientSecret=$($envVars['GOOGLE_CLIENT_SECRET'])"
    Write-Host "  OK Google OAuth credentials will be used" -ForegroundColor Green
}

if ($envVars['FACEBOOK_APP_ID'] -and $envVars['FACEBOOK_APP_SECRET']) {
    $cdkArgs += '-c'
    $cdkArgs += "facebookAppId=$($envVars['FACEBOOK_APP_ID'])"
    $cdkArgs += '-c'
    $cdkArgs += "facebookAppSecret=$($envVars['FACEBOOK_APP_SECRET'])"
    Write-Host "  OK Facebook OAuth credentials will be used" -ForegroundColor Green
}

if ($Destroy) {
    Write-Host "`nDeploying infrastructure and DESTROYING..." -ForegroundColor Yellow
    $cdkArgs[0] = 'destroy'
}

if ($DryRun) {
    Write-Host "`nDRY RUN - Command that would be executed:" -ForegroundColor Yellow
    Write-Host "cdk $($cdkArgs -join ' ')"
    exit 0
}

Write-Host "`nDeploying infrastructure with OAuth providers..." -ForegroundColor Cyan
& cdk @cdkArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment successful!" -ForegroundColor Green
    Write-Host "Google and Facebook OAuth providers are now configured in Cognito." -ForegroundColor Green
} else {
    Write-Host "`nDeployment failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

