# Legal Dashboard Infrastructure (AWS CDK)

AWS CDK infrastructure for the Legal Dashboard project. Defines DynamoDB tables and S3 buckets.

## Setup

1. Install dependencies:
```bash
npm install
npm install -g aws-cdk
npm install -g ts-node
```

2. Make sure LocalStack is running:
```bash
cd ..
docker-compose up -d
```

## Deployment

### Deploy to LocalStack (Development)
```bash
npm run deploy:localstack
```

This will create all DynamoDB tables and S3 buckets in LocalStack.

### Deploy to AWS (Production)
```bash
cdk bootstrap  # First time only
npm run cdk:deploy
```

## Common Commands

```bash
npm run cdk:synth    # Generate CloudFormation template
npm run cdk:diff     # Show what will be deployed
npm run cdk:destroy  # Destroy all resources
```

## Infrastructure

**DynamoDB Tables:**
- `users` - User accounts
- `clients` - Client information
- `packages` - Legal packages
- `file-numbers` - File number tracking
- `workflows` - Workflow state

**S3 Buckets:**
- `legal-documents-*` - Document storage

**Global Secondary Indexes:**
- `clients` → userIdIndex
- `packages` → clientIdIndex
- `file-numbers` → packageIdIndex
- `workflows` → packageIdIndex

## Cost Estimation

Using PAY_PER_REQUEST billing mode:
- DynamoDB: ~$1.25 per million read/write units
- S3: $0.023 per GB stored

For an MVP with light usage: ~$5-10/month
