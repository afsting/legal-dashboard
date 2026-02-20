import * as cdk from 'aws-cdk-lib';
import { LegalDashboardStack } from '../lib/legal-dashboard-stack';

const app = new cdk.App();

new LegalDashboardStack(app, 'LegalDashboardStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT,
  },
  description: 'Legal Dashboard Infrastructure',
});

app.synth();
