import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class LegalDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'users',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    const clientsTable = new dynamodb.Table(this, 'ClientsTable', {
      tableName: 'clients',
      partitionKey: { name: 'clientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    // Add GSI for querying clients by userId
    clientsTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const packagesTable = new dynamodb.Table(this, 'PackagesTable', {
      tableName: 'packages',
      partitionKey: { name: 'packageId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    // Add GSI for querying packages by clientId
    packagesTable.addGlobalSecondaryIndex({
      indexName: 'clientIdIndex',
      partitionKey: { name: 'clientId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const fileNumbersTable = new dynamodb.Table(this, 'FileNumbersTable', {
      tableName: 'file-numbers',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    // Add GSI for querying file numbers by packageId
    fileNumbersTable.addGlobalSecondaryIndex({
      indexName: 'packageIdIndex',
      partitionKey: { name: 'packageId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const workflowsTable = new dynamodb.Table(this, 'WorkflowsTable', {
      tableName: 'workflows',
      partitionKey: { name: 'workflowId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    // Add GSI for querying workflows by packageId
    workflowsTable.addGlobalSecondaryIndex({
      indexName: 'packageIdIndex',
      partitionKey: { name: 'packageId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // S3 Bucket for Documents
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      bucketName: 'legal-documents-dev',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'Users DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'ClientsTableName', {
      value: clientsTable.tableName,
      description: 'Clients DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'PackagesTableName', {
      value: packagesTable.tableName,
      description: 'Packages DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'FileNumbersTableName', {
      value: fileNumbersTable.tableName,
      description: 'File Numbers DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'WorkflowsTableName', {
      value: workflowsTable.tableName,
      description: 'Workflows DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: documentsBucket.bucketName,
      description: 'Documents S3 Bucket',
    });
  }
}
