@echo off
REM LocalStack CDK Deployment Script for Windows
REM This script deploys the CDK stack to LocalStack

setlocal enabledelayedexpansion

echo 🚀 Deploying Legal Dashboard Infrastructure to LocalStack...

REM Check if LocalStack is running
powershell -Command "Test-NetConnection localhost -Port 4566 -WarningAction SilentlyContinue" >nul 2>&1
if errorlevel 1 (
    echo ❌ LocalStack is not running on port 4566
    echo Please run: docker-compose up -d
    exit /b 1
)

echo ✓ LocalStack is running

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Set environment variables for LocalStack
set AWS_REGION=us-east-1
set AWS_ACCESS_KEY_ID=test
set AWS_SECRET_ACCESS_KEY=test
set AWS_ENDPOINT_URL=http://localhost:4566

REM Bootstrap CDK for LocalStack
echo ⚙️  Bootstrapping CDK...
call npx cdk bootstrap --require-approval never --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess 2>nul || true

REM Deploy the stack
echo 📐 Deploying CloudFormation stack...
call npx cdk deploy --require-approval never

echo ✅ Deployment complete!
echo.
echo DynamoDB tables and S3 buckets have been created in LocalStack.
echo.
echo Verify with:
echo   aws dynamodb list-tables --endpoint-url http://localhost:4566 --region us-east-1
echo   aws s3 ls --endpoint-url http://localhost:4566
