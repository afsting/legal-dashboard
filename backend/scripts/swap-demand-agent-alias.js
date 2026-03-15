/**
 * INTENT: Update demand sub-agent alias version on the supervisor agent.
 *
 * Because Bedrock locks an alias while it is registered as a collaborator
 * (including via frozen published supervisor versions), the locked alias
 * cannot be updated. The safe pattern is:
 *
 *   1. Delete the current demand collaborator from supervisor DRAFT
 *   2. Add the replacement alias as the new collaborator
 *   3. Prepare the supervisor DRAFT
 *   4. Update the supervisor alias (KAVUSSELUT) to route to DRAFT
 *
 * NOTE: The Bedrock console calls step 1 "Delete collaborator". The API calls
 * it DisassociateAgentCollaborator. They are the same operation.
 *
 * Usage:
 *   node backend/scripts/swap-demand-agent-alias.js
 *
 * To override which alias becomes the new active one, set NEW_DEMAND_ALIAS_ID
 * at the top of this file before running.
 */

const {
  BedrockAgentClient,
  ListAgentCollaboratorsCommand,
  DisassociateAgentCollaboratorCommand,
  AssociateAgentCollaboratorCommand,
  PrepareAgentCommand,
  GetAgentCommand,
  GetAgentAliasCommand,
  UpdateAgentAliasCommand,
} = require('@aws-sdk/client-bedrock-agent');

const REGION = 'us-east-1';

const SUPERVISOR_AGENT_ID  = 'DWVZ2DBY1S';
const SUPERVISOR_ALIAS_ID  = 'KAVUSSELUT';
const DEMAND_AGENT_ID      = 'IBOOSS6KQ5';
const NEW_DEMAND_ALIAS_ID  = 'WW6CV8GQJT'; // alias pointing at the updated version

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForAgentPrepared(client, agentId, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { agent } = await client.send(new GetAgentCommand({ agentId }));
    if (agent.agentStatus === 'PREPARED') return agent;
    if (agent.agentStatus === 'FAILED') throw new Error(`Agent failed: ${agent.failureReasons?.join(', ')}`);
    console.log(`  Supervisor status: ${agent.agentStatus} — waiting...`);
    await sleep(5000);
  }
  throw new Error('Timed out waiting for agent to prepare');
}

// ============================================================================
// MAIN
// ============================================================================

async function updateDemandAliasVersion() {
  const client = new BedrockAgentClient({ region: REGION });

  // ── Step 1: Resolve new alias ARN ─────────────────────────────────────────
  console.log(`\nFetching new demand alias (${NEW_DEMAND_ALIAS_ID})...`);
  const { agentAlias: newAlias } = await client.send(new GetAgentAliasCommand({
    agentId: DEMAND_AGENT_ID,
    agentAliasId: NEW_DEMAND_ALIAS_ID,
  }));
  const newAliasArn = newAlias.agentAliasArn;
  console.log(`  ARN: ${newAliasArn}`);
  console.log(`  Routes to: ${JSON.stringify(newAlias.routingConfiguration)}`);

  // ── Step 2: Find current demand collaborator on supervisor DRAFT ──────────
  console.log('\nListing supervisor collaborators...');
  const { agentCollaboratorSummaries = [] } = await client.send(
    new ListAgentCollaboratorsCommand({ agentId: SUPERVISOR_AGENT_ID, agentVersion: 'DRAFT' }),
  );
  agentCollaboratorSummaries.forEach(c =>
    console.log(`  - ${c.collaboratorName} (${c.collaboratorId}) → ${c.agentDescriptor?.aliasArn}`),
  );

  const demandCollaborator = agentCollaboratorSummaries.find(
    c => c.collaboratorName === 'DemandNarrativeAgent' || c.collaboratorName === 'demand-narrative-agent',
  );
  if (!demandCollaborator) {
    throw new Error('DemandNarrativeAgent collaborator not found on supervisor DRAFT');
  }
  console.log(`  Found collaborator ID: ${demandCollaborator.collaboratorId}`);

  // ── Step 3: Delete the old collaborator ───────────────────────────────────
  // (Console: "Delete collaborator" — API: DisassociateAgentCollaborator)
  console.log('\nDeleting old demand collaborator from supervisor...');
  await client.send(new DisassociateAgentCollaboratorCommand({
    agentId: SUPERVISOR_AGENT_ID,
    agentVersion: 'DRAFT',
    collaboratorId: demandCollaborator.collaboratorId,
  }));
  console.log('✓ Old collaborator deleted');

  // ── Step 4: Add new alias as collaborator ─────────────────────────────────
  console.log('\nAdding new demand alias as collaborator...');
  await client.send(new AssociateAgentCollaboratorCommand({
    agentId: SUPERVISOR_AGENT_ID,
    agentVersion: 'DRAFT',
    agentDescriptor: { aliasArn: newAliasArn },
    collaboratorName: 'DemandNarrativeAgent',
    collaborationInstruction: 'Drafts demand package narratives by reading case documents directly from S3. Use for requests containing "draft/generate/write a demand narrative" or "demand package narrative".',
  }));
  console.log('✓ New demand alias added as collaborator');

  // ── Step 5: Prepare supervisor ────────────────────────────────────────────
  console.log('\nPreparing supervisor agent...');
  await client.send(new PrepareAgentCommand({ agentId: SUPERVISOR_AGENT_ID }));
  await waitForAgentPrepared(client, SUPERVISOR_AGENT_ID);
  console.log('✓ Supervisor prepared');

  // ── Step 6: Update supervisor alias to DRAFT ──────────────────────────────
  console.log(`\nUpdating supervisor alias (${SUPERVISOR_ALIAS_ID}) to DRAFT...`);
  const { agentAlias: supAlias } = await client.send(new GetAgentAliasCommand({
    agentId: SUPERVISOR_AGENT_ID,
    agentAliasId: SUPERVISOR_ALIAS_ID,
  }));
  await client.send(new UpdateAgentAliasCommand({
    agentId: SUPERVISOR_AGENT_ID,
    agentAliasId: SUPERVISOR_ALIAS_ID,
    agentAliasName: supAlias.agentAliasName,
    routingConfiguration: [{ agentVersion: 'DRAFT' }],
  }));
  console.log('✓ Supervisor alias updated to DRAFT');

  console.log('\n✅ Done — demand narrative agent is live with updated instructions.');
  console.log(`   Active demand alias is now: ${NEW_DEMAND_ALIAS_ID}`);
  console.log('   No CDK redeploy needed.');
}

if (require.main === module) {
  updateDemandAliasVersion().catch(err => {
    console.error('❌', err.message);
    if (err.$metadata) console.error('   Request ID:', err.$metadata.requestId);
    process.exit(1);
  });
}

module.exports = { updateDemandAliasVersion };
