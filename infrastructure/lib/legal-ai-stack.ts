import * as cdk from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface LegalAiStackProps extends cdk.StackProps {
  documentsBucketName: string;
}

export class LegalAiStack extends cdk.Stack {
  public readonly knowledgeBaseId: string;
  public readonly agentId: string;
  public readonly agentAliasId: string;

  constructor(scope: Construct, id: string, props: LegalAiStackProps) {
    super(scope, id, props);

    // Import existing documents bucket from main stack
    const documentsBucket = s3.Bucket.fromBucketName(
      this,
      'DocumentsBucket',
      props.documentsBucketName
    );

    // ===== IAM ROLES (create first for access policies) =====
    // IAM Role for Knowledge Base
    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock Knowledge Base to access S3 and OpenSearch',
    });

    // IAM Role for Bedrock Agent
    const agentRole = new iam.Role(this, 'BedrockAgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock Agent to access Nova Pro and Knowledge Base',
    });

    // ===== OPENSEARCH SERVERLESS VECTOR STORAGE =====
    const vectorCollectionName = 'legal-docs-vectors';
    
    // Data access policy for OpenSearch
    const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(this, 'VectorDataAccessPolicy', {
      name: 'legal-docs-data-access',
      type: 'data',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'index',
              Resource: [`index/${vectorCollectionName}/*`],
              Permission: [
                'aoss:CreateIndex',
                'aoss:DeleteIndex',
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument'
              ]
            },
            {
              ResourceType: 'collection',
              Resource: [`collection/${vectorCollectionName}`],
              Permission: ['aoss:CreateCollectionItems', 'aoss:DescribeCollectionItems']
            }
          ],
          Principal: [
            knowledgeBaseRole.roleArn
          ]
        }
      ])
    });

    // Network policy for OpenSearch (allows public access)
    const networkPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'VectorNetworkPolicy', {
      name: 'legal-docs-network',
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${vectorCollectionName}`]
            }
          ],
          AllowFromPublic: true
        }
      ])
    });

    // Encryption policy for OpenSearch
    const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'VectorEncryptionPolicy', {
      name: 'legal-docs-encryption',
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${vectorCollectionName}`]
          }
        ],
        AWSOwnedKey: true
      })
    });

    // OpenSearch Serverless Collection
    const vectorCollection = new opensearchserverless.CfnCollection(this, 'VectorCollection', {
      name: vectorCollectionName,
      type: 'VECTORSEARCH',
      description: 'Vector storage for legal documents with metadata filtering'
    });
    
    vectorCollection.addDependency(dataAccessPolicy);
    vectorCollection.addDependency(networkPolicy);
    vectorCollection.addDependency(encryptionPolicy);

    // ===== BEDROCK KNOWLEDGE BASE =====
    // Grant S3 read access
    knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:ListBucket'
      ],
      resources: [
        `arn:aws:s3:::${props.documentsBucketName}`,
        `arn:aws:s3:::${props.documentsBucketName}/*`
      ]
    }));

    // Grant OpenSearch access - waitfor collection to be created first
    const opensearchPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'aoss:APIAccessAll'
      ],
      resources: [vectorCollection.attrArn]
    });
    knowledgeBaseRole.addToPolicy(opensearchPolicy);

    // Grant Bedrock embedding model access
    knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel'
      ],
      resources: [
        `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.titan-embed-text-v2:0`
      ]
    }));

    // Bedrock Knowledge Base
    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'LegalDocsKnowledgeBase', {
      name: 'legal-documents-kb',
      description: 'Knowledge base for legal case documents with metadata filtering by clientId and fileNumberId',
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.titan-embed-text-v2:0`
        }
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: vectorCollection.attrArn,
          vectorIndexName: 'bedrock-kb-default-index',
          fieldMapping: {
            vectorField: 'vector',
            textField: 'text',
            metadataField: 'metadata'
          }
        }
      }
    });

    knowledgeBase.addDependency(vectorCollection);
    knowledgeBase.node.addDependency(dataAccessPolicy);
    knowledgeBase.node.addDependency(knowledgeBaseRole);

    // S3 Data Source for Knowledge Base
    const dataSource = new bedrock.CfnDataSource(this, 'S3DataSource', {
      name: 'legal-documents-s3',
      description: 'S3 bucket containing legal documents organized by client and file number',
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${props.documentsBucketName}`
          // No inclusionPrefixes = include all documents in bucket
        }
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 512,
            overlapPercentage: 20
          }
        }
      }
    });

    // ===== BEDROCK AGENT WITH NOVA PRO =====
    // Grant agent access to invoke Nova Pro
    agentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.nova-pro-v1:0`
      ]
    }));

    // Grant agent access to retrieve from knowledge base
    agentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:Retrieve',
        'bedrock:RetrieveAndGenerate'
      ],
      resources: [knowledgeBase.attrKnowledgeBaseArn]
    }));

    // Bedrock Agent with Nova Pro
    const agent = new bedrock.CfnAgent(this, 'LegalAssistantAgent', {
      agentName: 'legal-assistant',
      description: 'AI assistant for legal case document analysis using Nova Pro',
      agentResourceRoleArn: agentRole.roleArn,
      foundationModel: 'amazon.nova-pro-v1:0',
      instruction: `You are a legal assistant helping lawyers analyze case documents. 
You have access to a knowledge base containing legal documents organized by client and file number.

When answering questions:
1. Always cite the specific document name and file number from the metadata
2. Provide accurate quotes from source documents with page numbers when available
3. If information is not in the documents, clearly state "I don't see that information in the case files"
4. Respect metadata filters - only search documents for the specified fileNumberId
5. Be concise, professional, and accurate
6. Summarize key facts from medical records, police reports, and incident documents
7. Identify potential gaps or inconsistencies in documentation

Important: You can only see documents that belong to the file number context provided in the query. 
Never conflate information from different clients or file numbers.`,
      idleSessionTtlInSeconds: 600,
      knowledgeBases: [
        {
          knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
          description: 'Legal documents organized by client and file number with metadata filtering',
          knowledgeBaseState: 'ENABLED'
        }
      ]
    });

    // Prepare agent (required before use)
    const agentAlias = new bedrock.CfnAgentAlias(this, 'LegalAssistantAgentAlias', {
      agentId: agent.attrAgentId,
      agentAliasName: 'production',
      description: 'Production alias for legal assistant agent'
    });

    // Store IDs for cross-stack reference
    this.knowledgeBaseId = knowledgeBase.attrKnowledgeBaseId;
    this.agentId = agent.attrAgentId;
    this.agentAliasId = agentAlias.attrAgentAliasId;

    // ===== OUTPUTS =====
    new cdk.CfnOutput(this, 'VectorCollectionEndpoint', {
      value: vectorCollection.attrCollectionEndpoint,
      description: 'OpenSearch Serverless collection endpoint',
      exportName: 'LegalAI-VectorCollectionEndpoint'
    });

    new cdk.CfnOutput(this, 'VectorCollectionArn', {
      value: vectorCollection.attrArn,
      description: 'OpenSearch Serverless collection ARN',
      exportName: 'LegalAI-VectorCollectionArn'
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: knowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
      exportName: 'LegalAI-KnowledgeBaseId'
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseArn', {
      value: knowledgeBase.attrKnowledgeBaseArn,
      description: 'Bedrock Knowledge Base ARN',
      exportName: 'LegalAI-KnowledgeBaseArn'
    });

    new cdk.CfnOutput(this, 'DataSourceId', {
      value: dataSource.attrDataSourceId,
      description: 'Knowledge Base Data Source ID (use for sync operations)',
      exportName: 'LegalAI-DataSourceId'
    });

    new cdk.CfnOutput(this, 'AgentId', {
      value: agent.attrAgentId,
      description: 'Bedrock Agent ID',
      exportName: 'LegalAI-AgentId'
    });

    new cdk.CfnOutput(this, 'AgentAliasId', {
      value: agentAlias.attrAgentAliasId,
      description: 'Bedrock Agent Alias ID (use this for invocations)',
      exportName: 'LegalAI-AgentAliasId'
    });

    new cdk.CfnOutput(this, 'AgentArn', {
      value: agent.attrAgentArn,
      description: 'Bedrock Agent ARN',
      exportName: 'LegalAI-AgentArn'
    });
  }
}
