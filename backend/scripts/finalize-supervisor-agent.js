/**
 * INTENT: Finalize the existing supervisor agent DWVZ2DBY1S.
 *
 * Prerequisites:
 *   - Collaboration must be enabled on both agent aliases in the Bedrock console:
 *       Chat agent:   V5DWKNJJJ2 / KDISPTDPE4
 *       Demand agent: IBOOSS6KQ5 / KG4FN2OZAK
 *
 * This script:
 *   1. Associates both sub-agents as collaborators with the supervisor
 *   2. Prepares the supervisor agent
 *   3. Creates an alias for the supervisor
 *
 * Usage:
 *   node backend/scripts/finalize-supervisor-agent.js
 *
 * Output:
 *   Prints BEDROCK_SUPERVISOR_AGENT_ALIAS_ID — add to infrastructure/.env.local
 *   and redeploy CDK stack.
 */

const {
  BedrockAgentClient,
  AssociateAgentCollaboratorCommand,
  PrepareAgentCommand,
  CreateAgentAliasCommand,
  GetAgentCommand,
  GetAgentAliasCommand,
  ListAgentCollaboratorsCommand,
} = require('@aws-sdk/client-bedrock-agent');

const REGION = 'us-east-1';

// Existing supervisor agent (already created, NOT_PREPARED)
const SUPERVISOR_AGENT_ID = 'DWVZ2DBY1S';

// Chat sub-agent
const CHAT_AGENT_ID = 'V5DWKNJJJ2';
const CHAT_AGENT_ALIAS_ID = 'KDISPTDPE4';

// Demand sub-agent
const DEMAND_AGENT_ID = 'IBOOSS6KQ5';
const DEMAND_AGENT_ALIAS_ARN = 'arn:aws:bedrock:us-east-1:315326805073:agent-alias/IBOOSS6KQ5/KG4FN2OZAK';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function getChatAgentAliasArn(client) {
  const { agentAlias } = await client.send(new GetAgentAliasCommand({
    agentId: CHAT_AGENT_ID,
    agentAliasId: CHAT_AGENT_ALIAS_ID,
  }));
  return agentAlias.agentAliasArn;
}

async function listExistingCollaborators(client, agentId) {
  const { agentCollaboratorSummaries = [] } = await client.send(
    new ListAgentCollaboratorsCommand({ agentId, agentVersion: 'DRAFT' }),
  );
  return agentCollaboratorSummaries.map(c => c.collaboratorName);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function finalizeSupervisorAgent() {
  const client = new BedrockAgentClient({ region: REGION });

  // Confirm supervisor exists
  console.log(`Fetching supervisor agent ${SUPERVISOR_AGENT_ID}...`);
  const { agent: supervisor } = await client.send(new GetAgentCommand({ agentId: SUPERVISOR_AGENT_ID }));
  console.log(`  Status: ${supervisor.agentStatus}`);
  console.log(`  Collaboration: ${supervisor.agentCollaboration}`);

  // Resolve chat alias ARN
  console.log('\nResolving chat agent alias ARN...');
  const chatAliasArn = await getChatAgentAliasArn(client);
  console.log(`  Chat alias ARN: ${chatAliasArn}`);
  console.log(`  Demand alias ARN: ${DEMAND_AGENT_ALIAS_ARN}`);

  // Check existing collaborators to avoid duplicate association errors
  console.log('\nChecking existing collaborators...');
  const existingCollaborators = await listExistingCollaborators(client, SUPERVISOR_AGENT_ID);
  console.log(`  Existing: ${existingCollaborators.length ? existingCollaborators.join(', ') : 'none'}`);

  // Associate chat sub-agent if not already associated
  if (!existingCollaborators.includes('ChatAgent')) {
    console.log('\nAssociating chat sub-agent...');
    await client.send(new AssociateAgentCollaboratorCommand({
      agentId: SUPERVISOR_AGENT_ID,
      agentVersion: 'DRAFT',
      agentDescriptor: { aliasArn: chatAliasArn },
      collaboratorName: 'ChatAgent',
      collaborationInstruction: 'Handles all general legal document Q&A, analysis, and cross-file queries via Knowledge Base.',
    }));
    console.log('✓ Chat sub-agent associated');
  } else {
    console.log('  Chat sub-agent already associated — skipping');
  }

  // Associate demand narrative sub-agent if not already associated
  if (!existingCollaborators.includes('DemandNarrativeAgent')) {
    console.log('\nAssociating demand narrative sub-agent...');
    await client.send(new AssociateAgentCollaboratorCommand({
      agentId: SUPERVISOR_AGENT_ID,
      agentVersion: 'DRAFT',
      agentDescriptor: { aliasArn: DEMAND_AGENT_ALIAS_ARN },
      collaboratorName: 'DemandNarrativeAgent',
      collaborationInstruction: 'Drafts demand package narratives by reading case documents directly from S3. Use for requests containing "draft/generate/write a demand narrative" or "demand package narrative".',
    }));
    console.log('✓ Demand narrative sub-agent associated');
  } else {
    console.log('  Demand narrative sub-agent already associated — skipping');
  }

  // Prepare the supervisor agent
  console.log('\nPreparing supervisor agent...');
  await client.send(new PrepareAgentCommand({ agentId: SUPERVISOR_AGENT_ID }));
  await waitForAgentPrepared(client, SUPERVISOR_AGENT_ID);
  console.log('✓ Supervisor agent prepared');

  // Create alias
  console.log('\nCreating agent alias...');
  const aliasResponse = await client.send(new CreateAgentAliasCommand({
    agentId: SUPERVISOR_AGENT_ID,
    agentAliasName: 'legal-supervisor-v1',
    description: 'Legal assistant supervisor — initial alias',
  }));

  const supervisorAliasId = aliasResponse.agentAlias.agentAliasId;
  console.log(`✓ Alias created: ${supervisorAliasId}`);

  // Output
  console.log('\n✅ Supervisor agent ready!');
  console.log('\n--- Add to infrastructure/.env.local ---');
  console.log(`BEDROCK_SUPERVISOR_AGENT_ID=${SUPERVISOR_AGENT_ID}`);
  console.log(`BEDROCK_SUPERVISOR_AGENT_ALIAS_ID=${supervisorAliasId}`);
  console.log('----------------------------------------');
  console.log('\nThen redeploy CDK:');
  console.log('  cd infrastructure && .\\scripts\\deploy-with-oauth.ps1');
}

if (require.main === module) {
  finalizeSupervisorAgent().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { finalizeSupervisorAgent };
