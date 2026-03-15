/**
 * INTENT: Create the Supervisor Agent in AWS Bedrock.
 *
 * The supervisor agent receives all frontend requests and routes them to:
 *   - Chat Sub-Agent (V5DWKNJJJ2) — general Q&A, document analysis, KB queries
 *   - Demand Narrative Sub-Agent   — draft/generate/write demand package narratives
 *
 * Routing is performed natively by Bedrock (SUPERVISOR collaboration mode).
 *
 * Prerequisites:
 *   - create-demand-agent.js has been run
 *   - DEMAND_AGENT_ALIAS_ARN env var set (from create-demand-agent.js output)
 *
 * Usage:
 *   DEMAND_AGENT_ALIAS_ARN=arn:aws:bedrock:... node backend/scripts/create-supervisor-agent.js
 *
 * Output:
 *   Prints BEDROCK_SUPERVISOR_AGENT_ID and BEDROCK_SUPERVISOR_AGENT_ALIAS_ID.
 *   Update your environment and redeploy backend (Step 8).
 */

const {
  BedrockAgentClient,
  CreateAgentCommand,
  PrepareAgentCommand,
  CreateAgentAliasCommand,
  AssociateAgentCollaboratorCommand,
  GetAgentCommand,
  GetAgentAliasCommand,
} = require('@aws-sdk/client-bedrock-agent');

const REGION = 'us-east-1';

// Existing chat sub-agent
const CHAT_AGENT_ID = 'V5DWKNJJJ2';
const CHAT_AGENT_ALIAS_ID = 'KDISPTDPE4';

// Demand sub-agent alias ARN (from create-demand-agent.js output)
const DEMAND_AGENT_ALIAS_ARN = process.env.DEMAND_AGENT_ALIAS_ARN;

// ---------------------------------------------------------------------------
// Supervisor agent instructions — routing only, no direct task handling
// ---------------------------------------------------------------------------

const SUPERVISOR_INSTRUCTIONS = `You are a routing supervisor for a legal case management assistant.

You have two specialist sub-agents:

1. CHAT AGENT — handles all general legal queries:
   - Answering questions about case documents
   - Document analysis and summaries
   - Cross-file searches
   - Any general question about a case, client, or legal matter

2. DEMAND NARRATIVE AGENT — handles demand package narrative drafting:
   - Triggered when the user wants to produce, create, draft, generate, or write a demand package or demand narrative
   - Reads documents directly from S3 to produce structured legal narratives

ROUTING RULES:
Route to DEMAND NARRATIVE AGENT when the user's request involves producing a demand package or demand narrative — including any of these patterns:
- Contains "demand package" or "demand narrative" or "demand letter narrative"
- Contains action words (draft, write, generate, create, build, produce, prepare) combined with "demand"
- Asks you to "do the demand" or "run the demand" or "start the demand"

Route to CHAT AGENT for everything else — questions about documents, case facts, summaries, and all other queries.

When in doubt about whether a request is demand-related, route to DEMAND NARRATIVE AGENT.

CONTEXT PASSING:
Always pass the full context (Client ID, File Number, File ID) through to the sub-agent unchanged so it can filter results to the correct case.

Do not answer questions directly. Always delegate to the appropriate sub-agent.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForAgentReady(client, agentId, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { agent } = await client.send(new GetAgentCommand({ agentId }));
    if (agent.agentStatus !== 'CREATING') return agent;
    console.log(`  Agent status: ${agent.agentStatus} — waiting...`);
    await sleep(3000);
  }
  throw new Error('Agent creation timed out');
}

async function waitForAgentPrepared(client, agentId, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { agent } = await client.send(new GetAgentCommand({ agentId }));
    if (agent.agentStatus === 'PREPARED') return agent;
    if (agent.agentStatus === 'FAILED') throw new Error(`Agent preparation failed: ${agent.failureReasons?.join(', ')}`);
    console.log(`  Agent status: ${agent.agentStatus} — waiting...`);
    await sleep(5000);
  }
  throw new Error('Agent preparation timed out');
}

/**
 * INTENT: Derive the alias ARN for the existing chat agent alias.
 * Bedrock alias ARN format: arn:aws:bedrock:{region}:{accountId}:agent-alias/{agentId}/{aliasId}
 */
async function getChatAgentAliasArn(client) {
  const { agentAlias } = await client.send(new GetAgentAliasCommand({
    agentId: CHAT_AGENT_ID,
    agentAliasId: CHAT_AGENT_ALIAS_ID,
  }));
  return agentAlias.agentAliasArn;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function createSupervisorAgent() {
  if (!DEMAND_AGENT_ALIAS_ARN) {
    console.error('❌ DEMAND_AGENT_ALIAS_ARN env var is required.');
    console.error('   Run create-demand-agent.js first and set the output value.');
    process.exit(1);
  }

  const client = new BedrockAgentClient({ region: REGION });

  // Step 1: Get chat agent config to copy IAM role + foundation model
  console.log('Fetching chat agent configuration...');
  const { agent: chatAgent } = await client.send(new GetAgentCommand({ agentId: CHAT_AGENT_ID }));
  console.log(`  Foundation model: ${chatAgent.foundationModel}`);
  console.log(`  IAM role ARN:     ${chatAgent.agentResourceRoleArn}`);

  // Step 2: Resolve chat agent alias ARN
  console.log('\nResolving chat agent alias ARN...');
  const chatAliasArn = await getChatAgentAliasArn(client);
  console.log(`  Chat alias ARN: ${chatAliasArn}`);
  console.log(`  Demand alias ARN: ${DEMAND_AGENT_ALIAS_ARN}`);

  // Step 3: Create supervisor agent
  console.log('\nCreating supervisor agent...');
  const createResponse = await client.send(new CreateAgentCommand({
    agentName: 'legal-assistant-supervisor',
    foundationModel: chatAgent.foundationModel,
    agentResourceRoleArn: chatAgent.agentResourceRoleArn,
    instruction: SUPERVISOR_INSTRUCTIONS,
    description: 'Supervisor agent that routes legal queries to chat or demand narrative sub-agents.',
    agentCollaboration: 'SUPERVISOR',
    idleSessionTTLInSeconds: 600,
  }));

  const supervisorAgentId = createResponse.agent.agentId;
  console.log(`✓ Supervisor agent created: ${supervisorAgentId}`);

  console.log('  Waiting for agent to be ready...');
  await waitForAgentReady(client, supervisorAgentId);
  console.log('  Agent is ready');

  // Step 4: Associate chat sub-agent as collaborator
  console.log('\nAssociating chat sub-agent...');
  await client.send(new AssociateAgentCollaboratorCommand({
    agentId: supervisorAgentId,
    agentVersion: 'DRAFT',
    agentDescriptor: {
      aliasArn: chatAliasArn,
    },
    collaboratorName: 'ChatAgent',
    collaborationInstruction: 'Handles all general legal document Q&A, analysis, and cross-file queries via Knowledge Base.',
  }));
  console.log('✓ Chat sub-agent associated');

  // Step 5: Associate demand narrative sub-agent as collaborator
  console.log('\nAssociating demand narrative sub-agent...');
  await client.send(new AssociateAgentCollaboratorCommand({
    agentId: supervisorAgentId,
    agentVersion: 'DRAFT',
    agentDescriptor: {
      aliasArn: DEMAND_AGENT_ALIAS_ARN,
    },
    collaboratorName: 'DemandNarrativeAgent',
    collaborationInstruction: 'Drafts demand package narratives by reading case documents directly from S3. Use for requests containing "draft/generate/write a demand narrative" or "demand package narrative".',
  }));
  console.log('✓ Demand narrative sub-agent associated');

  // Step 6: Prepare the supervisor agent
  console.log('\nPreparing supervisor agent...');
  await client.send(new PrepareAgentCommand({ agentId: supervisorAgentId }));
  await waitForAgentPrepared(client, supervisorAgentId);
  console.log('✓ Supervisor agent prepared');

  // Step 7: Create alias (Bedrock auto-routes to latest prepared version)
  console.log('\nCreating agent alias...');
  const aliasResponse = await client.send(new CreateAgentAliasCommand({
    agentId: supervisorAgentId,
    agentAliasName: 'legal-supervisor-v1',
    description: 'Legal assistant supervisor — initial alias',
  }));

  const supervisorAliasId = aliasResponse.agentAlias.agentAliasId;
  console.log(`✓ Alias created: ${supervisorAliasId}`);

  // Output
  console.log('\n✅ Supervisor agent ready!');
  console.log('\n--- Update your environment with these values (Step 8) ---');
  console.log(`BEDROCK_SUPERVISOR_AGENT_ID=${supervisorAgentId}`);
  console.log(`BEDROCK_SUPERVISOR_AGENT_ALIAS_ID=${supervisorAliasId}`);
  console.log('-----------------------------------------------------------');
  console.log('\nThen update BEDROCK_AGENT_ID and BEDROCK_AGENT_ALIAS_ID to point at the supervisor:');
  console.log(`  BEDROCK_AGENT_ID=${supervisorAgentId}`);
  console.log(`  BEDROCK_AGENT_ALIAS_ID=${supervisorAliasId}`);
  console.log('\nRedeploy the CDK stack or update Lambda env vars, then test.');
}

if (require.main === module) {
  createSupervisorAgent().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { createSupervisorAgent };
