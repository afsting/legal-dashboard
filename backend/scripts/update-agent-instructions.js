/**
 * INTENT: Update Bedrock Agent Instructions
 * 
 * Purpose: Updates the agent's system prompt to include context handling instructions
 * so it properly interprets and uses File Number context in queries.
 * 
 * Usage: node backend/scripts/update-agent-instructions.js
 */

const {
  BedrockAgentClient,
  UpdateAgentCommand,
  PrepareAgentCommand,
  GetAgentCommand,
  ListAgentVersionsCommand,
} = require('@aws-sdk/client-bedrock-agent');

const AGENT_ID = 'V5DWKNJJJ2';
const AGENT_ALIAS_ID = 'KDISPTDPE4';
const REGION = 'us-east-1';

const UPDATED_INSTRUCTIONS = `You are a highly knowledgeable legal document analysis assistant for law firms.

CONTEXT HANDLING:
When you receive a query, it may include context information in this format:
"Context: Client ID: [clientId], File Number: [fileNumber]

Query: [user question]"

The context tells you which specific case or client the user is asking about. ALWAYS:
1. Check if context is provided at the start of the query
2. Use the File Number to filter your knowledge base search to relevant documents
3. When responding about "this case" or "this file", refer to the File Number provided in context
4. If asked "What file number is this?", respond with the File Number from the context

EXAMPLE CONTEXT QUERIES:

Example 1:
Input: "Context: File Number: 00-02-26

Query: What file number is this?"

Response: "You are looking at file number 00-02-26."

Example 2:
Input: "Context: File Number: 00-02-26

Query: What documents do we have?"

Response: "For file number 00-02-26, the knowledge base contains: [list documents found for that file number]"

Example 3 (No Context):
Input: "Query: What is a demand package?"

Response: "A demand package is... [general answer without case-specific context]"

CORE TASKS:
- Summarizing legal documents in clear, plain language
- Extracting and listing key facts, obligations, deadlines, and parties
- Identifying important clauses, risks, and missing information
- Answering user questions about the content, context, and implications of documents
- Providing actionable insights and next steps when possible

Always cite the source document and section when referencing information. If you are unsure, say so and suggest what information is missing or unclear. Respond concisely and professionally, suitable for legal professionals and clients.

When context is provided, prioritize searching for documents related to that specific File Number or Client ID.`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAgentPrepared(client, agentId, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const getCommand = new GetAgentCommand({ agentId });
    const currentAgent = await client.send(getCommand);
    if (currentAgent.agent.agentStatus === 'PREPARED') {
      return currentAgent.agent;
    }
    await sleep(5000);
  }
  throw new Error('Agent preparation timed out');
}

async function updateAgentInstructions() {
  const client = new BedrockAgentClient({ region: REGION });

  try {
    console.log('Fetching current agent configuration...');
    
    // Step 1: Get current agent configuration
    const getCommand = new GetAgentCommand({ agentId: AGENT_ID });
    const currentAgent = await client.send(getCommand);
    
    console.log('Current agent name:', currentAgent.agent.agentName);
    console.log('Current foundation model:', currentAgent.agent.foundationModel);
    
    console.log('\nUpdating agent instructions...');
    
    // Update the agent with new instructions
    const updateCommand = new UpdateAgentCommand({
      agentId: AGENT_ID,
      agentName: currentAgent.agent.agentName,
      instruction: UPDATED_INSTRUCTIONS,
      foundationModel: currentAgent.agent.foundationModel,
      agentResourceRoleArn: currentAgent.agent.agentResourceRoleArn,
    });
    
    const updateResponse = await client.send(updateCommand);
    console.log('✓ Agent updated successfully');
    console.log('New agent version:', updateResponse.agent.agentVersion);
    
    console.log('\nPreparing agent (this may take 1-2 minutes)...');

    // Step 2: Prepare the agent (compile changes)
    const prepareCommand = new PrepareAgentCommand({ agentId: AGENT_ID });
    await client.send(prepareCommand);
    const preparedAgent = await waitForAgentPrepared(client, AGENT_ID);
    console.log('✓ Agent prepared with status:', preparedAgent.agentStatus);

    // Step 3: List versions to confirm DRAFT is updated
    console.log('\nListing agent versions...');
    const listVersionsCommand = new ListAgentVersionsCommand({ agentId: AGENT_ID });
    const versions = await client.send(listVersionsCommand);
    const summaries = versions.agentVersionSummaries || [];
    summaries
      .sort((a, b) => (a.agentVersion === 'DRAFT' ? 1 : 0) - (b.agentVersion === 'DRAFT' ? 1 : 0))
      .forEach((version) => {
        console.log(`- Version ${version.agentVersion} (${version.agentStatus}) updated ${version.updatedAt}`);
      });

    console.log('\n✅ Agent instructions updated successfully!');
    console.log('\nNext steps (publish the new DRAFT version):');
    console.log('1. Open Bedrock Console > Agents > legal-assistant');
    console.log('2. Click "Create version" (from DRAFT)');
    console.log('3. Update alias "default_legal_assistant" to the new version');
    console.log('4. Test: ask "What file number is this?" on a file number page');
    
  } catch (error) {
    console.error('❌ Error updating agent:', error.message);
    if (error.$metadata) {
      console.error('Request ID:', error.$metadata.requestId);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateAgentInstructions();
}

module.exports = { updateAgentInstructions };
