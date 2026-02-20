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

This will create all DynamoDB tables, S3 buckets, and the Lambda/API Gateway
resources in LocalStack.

### Deploy to AWS (Production)
```bash
cdk bootstrap  # First time only
npm run cdk:deploy
```

### Deploy to AWS (Staging)
Use the staging helpers so you can pass CORS/JWT settings as parameters. If you
omit `JwtSecret`, CDK will generate a Secrets Manager value.
```powershell
npm run deploy:staging -- -FrontendOrigin https://your-frontend-domain -JwtSecret your-super-secret-jwt-key -JwtExpiry 7d
```

To tear down staging:
```powershell
npm run destroy:staging -- -FrontendOrigin https://your-frontend-domain -JwtSecret your-super-secret-jwt-key -JwtExpiry 7d
```

If you have a frontend domain, pass it for CORS:
```bash
cdk deploy -c frontendOrigin=https://your-frontend-domain
```

Set JWT config at deploy time (optional if you want CDK to generate a secret):
```bash
cdk deploy -c jwtSecret=your-super-secret-jwt-key -c jwtExpiry=7d
```

LocalStack deploy with CORS/JWT context:
```bash
cdk deploy --endpoint-url http://localhost:4566 --region us-east-1 -c useLocalstack=true -c frontendOrigin=http://localhost:5174 -c jwtSecret=local-dev-secret
```

### JWT Rotation
Rotate the Secrets Manager JWT value (this invalidates existing tokens):
```powershell
npm run rotate:jwt -- -SecretName legal-dashboard-jwt -Region us-east-1
```

Before deploying, make sure backend dependencies are installed so the Lambda
asset includes `node_modules`:
```bash
cd ../backend
npm install
cd ../infrastructure
```

### Frontend Hosting (CloudFront)
The stack uploads your built frontend from `../dist` by default. Build first:
```bash
cd ../
npm install
npm run build
cd infrastructure
```

If your build output is in a different folder, pass `frontendDistPath`:
```bash
cdk deploy -c frontendDistPath=../path-to-dist
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
