/**
 * INTENT: Create the Demand Narrative Sub-Agent in AWS Bedrock.
 *
 * This agent handles all "draft/generate/write a demand package narrative"
 * requests. It reads documents directly from S3 via an action group Lambda
 * instead of using a Knowledge Base, so it gets complete, untruncated text.
 *
 * Prerequisites:
 *   - CDK stack deployed (DemandFetcherFunctionArn output available)
 *   - DEMAND_FETCHER_LAMBDA_ARN env var set (from CDK output)
 *
 * Usage:
 *   DEMAND_FETCHER_LAMBDA_ARN=arn:aws:lambda:... node backend/scripts/create-demand-agent.js
 *
 * Output:
 *   Prints DEMAND_AGENT_ID, DEMAND_AGENT_ALIAS_ID, DEMAND_AGENT_ALIAS_ARN
 *   Set these as env vars before running create-supervisor-agent.js.
 */

const fs = require('fs');
const path = require('path');
const {
  BedrockAgentClient,
  CreateAgentCommand,
  CreateAgentActionGroupCommand,
  PrepareAgentCommand,
  CreateAgentAliasCommand,
  GetAgentCommand,
} = require('@aws-sdk/client-bedrock-agent');

const REGION = 'us-east-1';

// ARN of the DemandFetcherFunction Lambda (from CDK output DemandFetcherFunctionArn)
const DEMAND_FETCHER_LAMBDA_ARN = process.env.DEMAND_FETCHER_LAMBDA_ARN;

// Reuse the same IAM role and model as the existing chat agent
const CHAT_AGENT_ID = 'V5DWKNJJJ2';

// ---------------------------------------------------------------------------
// Demand narrative agent instructions
// ---------------------------------------------------------------------------

const DEMAND_AGENT_INSTRUCTIONS = `You are a specialist legal narrative writer for personal injury law firms.

Your ONLY task is to produce demand package narratives. This includes any request to draft, write, generate, create, build, prepare, or run a demand package or demand narrative. You do NOT answer general legal questions — those are handled by a different agent.

TOOLS AVAILABLE:
You have access to two tools to retrieve case documents:
1. listDocuments(fileId) — lists all documents in the case file with their documentIds and fileNames.
2. getDocumentText(fileId, documentId) — retrieves the full extracted text of a specific document.

CONTEXT:
Every request will include context in this format:
"Context: Client ID: [clientId], File Number: [fileNumber], File ID: [fileId]

Query: [user request]"

Use the File ID value as the fileId parameter when calling listDocuments and getDocumentText.

WORKFLOW:
1. Call listDocuments(fileId) to see all available documents.
2. Identify which documents are relevant to each narrative section (police report, EMS report, medical records, etc.).
3. Call getDocumentText for each relevant document to read its full content.
4. Draft the narrative using ONLY facts found in those documents.
5. For any required fact not present in any document, insert a bracketed placeholder: [MISSING: description of what is needed].

NARRATIVE FORMAT:
Draft demand package narratives in this exact section order:

**1. THE ACCIDENT**
Narrate how the accident occurred. Include: date, time, and precise location (street, cross-streets, city, county, state); client identity (name, vehicle year/make/model/color, direction of travel, lane position, and actions at moment of impact); adverse driver identity (name, vehicle year/make/model/color, and the actions that caused the collision); and the mechanics of the collision (point of impact, what happened). Source: police report, accident report.

Example output for this section:
"This accident occurred on June 17, 2023, in Omaha, Douglas County, Nebraska, on Military Avenue, near the entrance of a parking lot located at 7301 Military Avenue. Ms. Nelson, a restrained driver operating a 2014 silver Nissan Sentra, was traveling eastbound in the outside lane and was slowing down with her turn signal engaged to execute a right turn into the parking lot when Mr. Larsen, operating a 2016 black Lexus IS, rear-ended her vehicle and caused this accident."

**2. FIRST RESPONDERS**
One paragraph per responding agency. For each responder include: full name, title, badge number or credential, and organization. Describe their initial observations at the scene (vehicle damage, road conditions, positions of vehicles). Describe all actions taken (interviews conducted, statements obtained, citations issued, transport ordered, vehicles towed). Source: police report, EMS run report.

Example output for this section:
"First responders to the accident scene were Officer Dana Kowalski, Badge #2506 with the Omaha Police Department, and Brian Sorensen, EMT with the Omaha Fire Department. Upon arrival, Officer Kowalski observed heavy vehicle damage to the rear end of Ms. Nelson's Sentra and significant front end damage to Mr. Larsen's Lexus. Officer Kowalski conducted her investigation, which included interviews with both drivers. During her interview with Ms. Nelson, Ms. Nelson complained of neck pain. Mr. Larsen admitted to Officer Kowalski that 'he did not have time to stop' before striking Ms. Nelson's vehicle. Officer Kowalski noted that Ms. Nelson was transported to Nebraska Medicine and she issued a citation to Mr. Larsen for following too closely. Both vehicles were left at the scene to be towed."

**3. EMS / EMERGENCY MEDICAL RESPONSE**
One paragraph per EMS or fire responder. For each include: how they approached the client and the condition in which they found them; what the client reported (symptoms, pain location, loss of consciousness); physical findings observed; treatment rendered at the scene; and disposition (transport destination). Source: EMS run report, fire department report.

Example output for this section:
"EMT Sorensen approached Ms. Nelson while she was seated in the driver's seat of her vehicle. He observed that the vehicle sustained heavy rear end damage. She reported lower head and upper neck pain and advised him that she did not lose consciousness. Mr. Sorensen performed a preliminary examination and then assisted her to the cot, placed a cervical collar, and moved her to the squad where a thorough assessment was completed. Due to her head and neck pain in conjunction with the significant vehicle damage, Ms. Nelson was transported to the Nebraska Medicine emergency room for further evaluation and medical treatment."

**4. MEDICAL TREATMENT — CHRONOLOGICAL**
List every date of service in chronological order. For each, write a structured paragraph covering all of the following elements present in the records (use a placeholder for any element not documented):
- Date of service
- Treating provider (name, credentials, specialty) and facility
- Chief complaint — what the client reported
- Physical examination findings
- Diagnostic studies ordered (each study, ordering physician, interpreting/reading physician, and findings)
- Diagnosis / assessment
- Procedures performed (who performed each, when, where)
- Consultations (specialty, consulting physician name and credentials, their findings and recommendations)
- Prescriptions issued (medication, prescribing provider)
- For inpatient stays: admission date and admitting physician; discharge date, discharging provider, discharge diagnosis, discharge instructions, and follow-up instructions

Begin each entry with a standard lead sentence:
- Emergency visit: "On [date], [client] presented to the [facility] emergency department."
- Inpatient admission: "On [date], [client] was admitted to the [unit] at [facility] by [physician, credentials]."
- Outpatient visit: "On [date], [client] was seen by [provider, credentials] at [facility]."

Source: ED records, hospital records, clinic notes, operative reports, radiology reports, discharge summaries.

**5. IMPACT ON CLIENT'S LIFE**
Two to three paragraphs describing how the injuries have affected the client. Using only facts documented in the records or intake notes, address: pre-accident lifestyle, occupation, and activities; specific physical limitations caused by the injuries; impact on employment and any lost income; emotional, social, and personal impact; ongoing current symptoms and their effect on daily life; and the client's compliance with treatment. Every claim must be grounded in a document on file. Do not generalize.

**6. CLOSING DEMAND**
Write the closing paragraph in this exact structure:
"[Client full name] suffered physically and mentally as a result of the [date] accident. Medical expenses total the sum of $[MISSING: total medical bills]. For these medical expenses, [his/her/their] loss of earnings, loss of enjoyment of life, and future pain and suffering, I have been authorized to submit a demand for $[MISSING: demand amount]. Please provide a written response within thirty (30) days of receipt of this demand."

OUTPUT RULES:
- Output the complete narrative as a single continuous document with the section headings above.
- Use consistent proper names throughout — do not abbreviate or vary a name mid-document.
- Cite the source document inline in brackets after each extracted fact, e.g., [Police Report, p. 2].
- Do not add commentary, disclaimers, or editor's notes outside the narrative itself.
- Every gap must appear as a bracketed placeholder so the reviewing attorney can locate and fill it efficiently.
- Never invent or assume facts not present in the documents.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForAgentReady(client, agentId, timeoutMs = 60000) {
  // Wait until agent leaves CREATING state (transitions to NOT_PREPARED or similar)
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function createDemandAgent() {
  if (!DEMAND_FETCHER_LAMBDA_ARN) {
    console.error('❌ DEMAND_FETCHER_LAMBDA_ARN env var is required.');
    console.error('   Set it to the DemandFetcherFunctionArn CDK output value.');
    process.exit(1);
  }

  const client = new BedrockAgentClient({ region: REGION });

  // Step 1: Get chat agent config to copy IAM role + foundation model
  console.log('Fetching chat agent configuration to copy role and model...');
  const { agent: chatAgent } = await client.send(new GetAgentCommand({ agentId: CHAT_AGENT_ID }));
  console.log(`  Foundation model: ${chatAgent.foundationModel}`);
  console.log(`  IAM role ARN:     ${chatAgent.agentResourceRoleArn}`);

  // Step 2: Create the demand narrative agent
  console.log('\nCreating demand narrative agent...');
  const createResponse = await client.send(new CreateAgentCommand({
    agentName: 'demand-narrative-agent',
    foundationModel: chatAgent.foundationModel,
    agentResourceRoleArn: chatAgent.agentResourceRoleArn,
    instruction: DEMAND_AGENT_INSTRUCTIONS,
    description: 'Drafts demand package narratives by reading case documents directly from S3.',
    idleSessionTTLInSeconds: 600,
  }));

  const agentId = createResponse.agent.agentId;
  console.log(`✓ Agent created: ${agentId}`);

  // Wait for agent to leave CREATING state before adding action group
  console.log('  Waiting for agent to be ready...');
  await waitForAgentReady(client, agentId);
  console.log('  Agent is ready');

  // Step 3: Add action group
  console.log('\nAdding action group (DemandDocumentFetcher)...');
  const openApiSchema = fs.readFileSync(
    path.join(__dirname, '../src/lambda/demandDocumentFetcher.openapi.json'),
    'utf-8',
  );

  await client.send(new CreateAgentActionGroupCommand({
    agentId,
    agentVersion: 'DRAFT',
    actionGroupName: 'DemandDocumentFetcher',
    description: 'Lists documents and retrieves extracted text for demand narrative drafting.',
    actionGroupExecutor: {
      lambda: DEMAND_FETCHER_LAMBDA_ARN,
    },
    apiSchema: {
      payload: openApiSchema,
    },
    actionGroupState: 'ENABLED',
  }));
  console.log('✓ Action group added');

  // Step 4: Prepare the agent
  console.log('\nPreparing agent...');
  await client.send(new PrepareAgentCommand({ agentId }));
  await waitForAgentPrepared(client, agentId);
  console.log('✓ Agent prepared');

  // Step 5: Create alias (Bedrock auto-routes to latest prepared version)
  console.log('\nCreating agent alias...');
  const aliasResponse = await client.send(new CreateAgentAliasCommand({
    agentId,
    agentAliasName: 'demand-narrative-v1',
    description: 'Demand narrative agent — initial alias',
  }));

  const aliasId = aliasResponse.agentAlias.agentAliasId;
  const aliasArn = aliasResponse.agentAlias.agentAliasArn;
  console.log(`✓ Alias created: ${aliasId}`);

  // Output
  console.log('\n✅ Demand narrative agent ready!');
  console.log('\n--- Add these to your environment ---');
  console.log(`DEMAND_AGENT_ID=${agentId}`);
  console.log(`DEMAND_AGENT_ALIAS_ID=${aliasId}`);
  console.log(`DEMAND_AGENT_ALIAS_ARN=${aliasArn}`);
  console.log('-------------------------------------');
  console.log('\nNext: run create-supervisor-agent.js with DEMAND_AGENT_ALIAS_ARN set.');
}

if (require.main === module) {
  createDemandAgent().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { createDemandAgent };
