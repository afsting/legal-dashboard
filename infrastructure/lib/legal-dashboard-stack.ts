import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';

export class LegalDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const useLocalstack = this.node.tryGetContext('useLocalstack') === 'true'
      || this.node.tryGetContext('useLocalstack') === true;
    const removalPolicy = useLocalstack ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'users',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    const clientsTable = new dynamodb.Table(this, 'ClientsTable', {
      tableName: 'clients',
      partitionKey: { name: 'clientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
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
      removalPolicy,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    // Add GSI for querying packages by clientId
    packagesTable.addGlobalSecondaryIndex({
      indexName: 'clientIdIndex',
      partitionKey: { name: 'clientId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for querying packages by fileNumberId
    packagesTable.addGlobalSecondaryIndex({
      indexName: 'fileNumberIdIndex',
      partitionKey: { name: 'fileNumberId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const fileNumbersTable = new dynamodb.Table(this, 'FileNumbersTable', {
      tableName: 'file-numbers',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
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
      removalPolicy,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    const documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
      tableName: 'documents',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'documentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      encryption: dynamodb.TableEncryption.DEFAULT,
    });

    // Add GSI for querying workflows by packageId
    workflowsTable.addGlobalSecondaryIndex({
      indexName: 'packageIdIndex',
      partitionKey: { name: 'packageId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const frontendOrigin = this.node.tryGetContext('frontendOrigin') || 'http://localhost:5174';

    // Cognito User Pool with Google and Facebook OAuth
    const userPool = new cognito.UserPool(this, 'LegalDashboardUserPool', {
      userPoolName: 'legal-dashboard-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy,
      mfa: cognito.Mfa.OPTIONAL,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Create identity providers BEFORE app client
    const googleClientId = this.node.tryGetContext('googleClientId') || '';
    const googleClientSecret = this.node.tryGetContext('googleClientSecret') || '';
    let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;
    
    if (googleClientId && googleClientSecret) {
      googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdp', {
        userPool,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        scopes: ['profile', 'email', 'openid'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      });
    }

    // Facebook OAuth Identity Provider
    const facebookAppId = this.node.tryGetContext('facebookAppId') || '';
    const facebookAppSecret = this.node.tryGetContext('facebookAppSecret') || '';
    let facebookProvider: cognito.UserPoolIdentityProviderFacebook | undefined;
    
    if (facebookAppId && facebookAppSecret) {
      facebookProvider = new cognito.UserPoolIdentityProviderFacebook(this, 'FacebookIdp', {
        userPool,
        clientId: facebookAppId,
        clientSecret: facebookAppSecret,
        scopes: ['public_profile', 'email'],
        attributeMapping: {
          email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
          givenName: cognito.ProviderAttribute.FACEBOOK_FIRST_NAME,
          familyName: cognito.ProviderAttribute.FACEBOOK_LAST_NAME,
        },
      });
    }

    // Create Cognito App Client for web with OAuth flows enabled (AFTER identity providers)
    const userPoolClient = new cognito.UserPoolClient(this, 'LegalDashboardAppClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        adminUserPassword: true,
        custom: true,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.FACEBOOK,
      ],
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true,
        },
        callbackUrls: [
          'http://localhost:5173/auth/callback',
          'http://localhost:5174/auth/callback',
          'https://d1bkh7cjshkl4w.cloudfront.net/auth/callback',
        ],
        logoutUrls: [
          'http://localhost:5173/login',
          'http://localhost:5174/login',
          'https://d1bkh7cjshkl4w.cloudfront.net/login',
        ],
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
      },
    });

    // Add dependencies to ensure identity providers are created before client
    if (googleProvider) {
      userPoolClient.node.addDependency(googleProvider);
    }
    if (facebookProvider) {
      userPoolClient.node.addDependency(facebookProvider);
    }

    // Create Cognito User Pool Domain for hosted UI
    const userPoolDomain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: `legal-dashboard-${cdk.Aws.ACCOUNT_ID}`,
      },
    });

    // Create User Groups for role-based access control
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin',
      description: 'Administrators with full access',
      precedence: 0,
    });

    new cognito.CfnUserPoolGroup(this, 'UserGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'user',
      description: 'Standard users with read/write access',
      precedence: 1,
    });

    // S3 Bucket for Documents
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      bucketName: useLocalstack
        ? 'legal-documents-local'
        : `legal-documents-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy,
      autoDeleteObjects: useLocalstack,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: [frontendOrigin],
          allowedHeaders: ['*'],
          exposedHeaders: [
            'ETag',
            'x-amz-version-id',
            'x-amz-delete-marker',
          ],
          maxAge: 3000,
        },
      ],
    });

    const jwtSecretContext = this.node.tryGetContext('jwtSecret');
    const jwtExpiry = this.node.tryGetContext('jwtExpiry') || '7d';

    const jwtSecret = useLocalstack
      ? undefined
      : new secretsmanager.Secret(this, 'JwtSecret', {
          secretName: 'legal-dashboard-jwt',
          secretStringValue: jwtSecretContext
            ? cdk.SecretValue.unsafePlainText(jwtSecretContext)
            : undefined,
          generateSecretString: jwtSecretContext
            ? undefined
            : {
                passwordLength: 32,
                excludePunctuation: true,
              },
        });

    const baseEnv: Record<string, string> = {
      NODE_ENV: useLocalstack ? 'development' : 'production',
      CORS_ORIGIN: frontendOrigin,
      JWT_EXPIRY: jwtExpiry,
      DYNAMODB_TABLE_USERS: usersTable.tableName,
      DYNAMODB_TABLE_CLIENTS: clientsTable.tableName,
      DYNAMODB_TABLE_PACKAGES: packagesTable.tableName,
      DYNAMODB_TABLE_FILE_NUMBERS: fileNumbersTable.tableName,
      DYNAMODB_TABLE_WORKFLOWS: workflowsTable.tableName,
      DYNAMODB_TABLE_DOCUMENTS: documentsTable.tableName,
      S3_BUCKET_DOCUMENTS: documentsBucket.bucketName,
    };

    const localstackEnv: Record<string, string> = useLocalstack
      ? {
          AWS_ENDPOINT_URL: 'http://localhost:4566',
          AWS_ACCESS_KEY_ID: 'test',
          AWS_SECRET_ACCESS_KEY: 'test',
          JWT_SECRET: jwtSecretContext || 'local-dev-secret',
        }
      : {};

    const awsEnv: Record<string, string> = jwtSecret
      ? {
          JWT_SECRET_ARN: jwtSecret.secretArn,
        }
      : {};

    const bedrocKAgentId = this.node.tryGetContext('bedrockAgentId') || '';
    const bedrockAgentAliasId = this.node.tryGetContext('bedrockAgentAliasId') || '';

    const backendFunction = new lambda.Function(this, 'BackendFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'src/lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ...baseEnv,
        ...localstackEnv,
        ...awsEnv,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        BEDROCK_AGENT_ID: bedrocKAgentId,
        BEDROCK_AGENT_ALIAS_ID: bedrockAgentAliasId,
      },
    });

    backendFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:ListUsers',
        'cognito-idp:AdminAddUserToGroup',
        'cognito-idp:AdminRemoveUserFromGroup',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminListGroupsForUser',
        'cognito-idp:AdminGetUser',
      ],
      resources: [userPool.userPoolArn],
    }));

    // Grant Bedrock agent invocation permissions
    backendFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeAgent'],
      resources: [
        `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:agent/*`,
        `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:agent-alias/*`,
      ],
    }));

    if (jwtSecret) {
      jwtSecret.grantRead(backendFunction);
    }

    usersTable.grantReadWriteData(backendFunction);
    clientsTable.grantReadWriteData(backendFunction);
    packagesTable.grantReadWriteData(backendFunction);
    fileNumbersTable.grantReadWriteData(backendFunction);
    workflowsTable.grantReadWriteData(backendFunction);
    documentsTable.grantReadWriteData(backendFunction);
    documentsBucket.grantReadWrite(backendFunction);

    const allowedOrigins = [
      frontendOrigin,
      'https://d1bkh7cjshkl4w.cloudfront.net',
      'https://d1a0t4zzh748tj.cloudfront.net',
      'http://localhost:5173',
      'http://localhost:5174'
    ].filter(Boolean);

    const api = new apigw.LambdaRestApi(this, 'BackendApi', {
      handler: backendFunction,
      proxy: true,
      binaryMediaTypes: ['multipart/form-data'],
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    if (!useLocalstack) {
      const frontendDistPath = this.node.tryGetContext('frontendDistPath')
        || path.join(__dirname, '../../dist');

      const siteBucket = new s3.Bucket(this, 'FrontendBucket', {
        removalPolicy,
        autoDeleteObjects: false,
        versioned: true,
        encryption: s3.BucketEncryption.S3_MANAGED,
        publicReadAccess: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      });

      const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI');
      siteBucket.grantRead(originAccessIdentity);

      const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: new origins.S3Origin(siteBucket, { originAccessIdentity }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
        ],
      });

      new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
        sources: [s3deploy.Source.asset(frontendDistPath)],
        destinationBucket: siteBucket,
        distribution,
        distributionPaths: ['/*'],
      });

      new cdk.CfnOutput(this, 'FrontendBucketName', {
        value: siteBucket.bucketName,
        description: 'Frontend S3 bucket',
      });

      new cdk.CfnOutput(this, 'CloudFrontUrl', {
        value: `https://${distribution.domainName}`,
        description: 'CloudFront distribution URL',
      });
    }

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

    new cdk.CfnOutput(this, 'DocumentsTableName', {
      value: documentsTable.tableName,
      description: 'Documents DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: documentsBucket.bucketName,
      description: 'Documents S3 Bucket',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway base URL',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolArn', {
      value: userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
    });

    new cdk.CfnOutput(this, 'CognitoAuthDomain', {
      value: userPoolDomain.domainName,
      description: 'Cognito Auth Domain',
    });
  }
}

