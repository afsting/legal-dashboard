#!/bin/bash

# LocalStack CDK Deployment Script
# This script deploys the CDK stack to LocalStack

set -e

echo "🚀 Deploying Legal Dashboard Infrastructure to LocalStack..."

# Check if LocalStack is running
if ! nc -z localhost 4566 2>/dev/null; then
    echo "❌ LocalStack is not running on port 4566"
    echo "Please run: docker-compose up -d"
    exit 1
fi

echo "✓ LocalStack is running"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variables for LocalStack
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_ENDPOINT_URL=http://localhost:4566

# Bootstrap CDK for LocalStack (only needed once)
echo "⚙️  Bootstrapping CDK..."
npx cdk bootstrap --require-approval never \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    2>/dev/null || true

# Deploy the stack
echo "📐 Deploying CloudFormation stack..."
npx cdk deploy --require-approval never

echo "✅ Deployment complete!"
echo ""
echo "DynamoDB tables and S3 buckets have been created in LocalStack."
echo ""
echo "Verify with:"
echo "  aws dynamodb list-tables --endpoint-url http://localhost:4566 --region us-east-1"
echo "  aws s3 ls --endpoint-url http://localhost:4566"
