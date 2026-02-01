import * as cdk from 'aws-cdk-lib';
import { LegalDashboardStack } from '../lib/legal-dashboard-stack';

const app = new cdk.App();

new LegalDashboardStack(app, 'LegalDashboardStack', {
  env: {
    region: process.env.AWS_REGION || 'us-east-1',
    account: process.env.AWS_ACCOUNT || '123456789012',
  },
  description: 'Legal Dashboard Infrastructure',
});

app.synth();
