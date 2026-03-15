# Task: Demand Letter — Save to Demand Package as a Document

## Status: READY — Prerequisite deployed ✅, ready to implement demand letter save
Last updated: 2026-03-15

---

## Prerequisite: Fix API Gateway Timeout (IN PROGRESS)

**Problem:** Demand letter requests fail with a CORS error because API Gateway
has a hard 29-second integration timeout. Long Bedrock agent calls (demand
letter with per-treatment summaries) exceed this limit, causing a 504 with no
CORS headers.

**Fix:** Async job pattern
- `POST /api/agent/query` → creates a DynamoDB job record + fires an async
  worker Lambda (no 29s limit) → returns `{ jobId, status: 'pending' }` immediately
- `GET /api/agent/jobs/:jobId` → frontend polls every 3s until `status: 'complete'`
- New files:
  - `backend/src/models/AgentJob.js` ✅
  - `backend/src/lambda/agentWorker.js` ✅
  - Updated `agentController.js` ✅
  - Updated `routes/agent.js` ✅
  - Updated `infrastructure/lib/legal-dashboard-stack.ts` ✅ — adds
    `agent-jobs` DynamoDB table, worker Lambda, and CORS GatewayResponse headers
  - Updated `AgentSidebar.vue` ✅ — polling loop
- Deployed: 2026-03-15 ✅ (CDK deploy + frontend S3 sync + CloudFront invalidation)
- CloudFront invalidation: `IB24XGYANKSC6FXT2W2DK65OV9` (allow ~5 min to propagate)

**Next step:** test demand letter in prod before implementing the save flow.
The demand letter save logic will go in `agentWorker.js` (not `agentController.js`)
since that is where the full Bedrock response is available after the async job runs.

---

---

## Context (Previous Task)

The supervisor agent architecture is live and working:
- Supervisor: `DWVZ2DBY1S` / alias `KAVUSSELUT`
- Chat sub-agent: `V5DWKNJJJ2` / alias `KDISPTDPE4`
- Demand narrative sub-agent: `IBOOSS6KQ5` / alias `KG4FN2OZAK`

When a user asks the agent to "draft a demand narrative", the supervisor routes to the demand sub-agent, which reads documents from S3 and returns the full narrative as chat text. That part works.

**What's missing:** The narrative only appears in the chat sidebar. It should also be saved as a document in the demand package so attorneys can access, download, and share it.

---

## What We Are Building

When the demand narrative agent completes a narrative, automatically:
1. Save the narrative text as a new document in the demand package for that file number
2. The document should be named `demand-letter-{fileNumber}.txt` (or similar)
3. It should appear in the demand package document list / checklist view

The chat sidebar output can remain as-is — the save is additive.

---

## Key Questions to Resolve Before Starting

1. **Where is the document stored?** The existing document model stores files in S3 (`clients/{clientId}/file-numbers/{fileNumber}/docs/{fileName}`) with a DynamoDB metadata record. The demand letter should follow the same pattern.

2. **Who triggers the save?** Options:
   - A) **Frontend** — after receiving the demand narrative response in `AgentSidebar.vue`, detect that it was a demand narrative response and call a backend endpoint to save it.
   - B) **Backend** — `agentController.js` detects the demand narrative response and saves it before returning the answer to the frontend.
   - Option B is cleaner (no frontend logic for detecting response type), but requires the backend to know the response came from the demand sub-agent.

3. **How does the backend know it was a demand narrative response?**
   - The Bedrock supervisor response includes trace data with the sub-agent that was invoked — could inspect this.
   - Alternatively, a simpler heuristic: if the query contains "demand" keywords AND the response is long/structured, save it.
   - Cleanest: add a `saveAsDemandLetter: true` flag in the request payload when the frontend sends a demand-related query (frontend already has context).

4. **What package does it save to?** The `fileNumberId` is already passed in the agent query context. Use that to look up or create the demand package for that file number, then attach the document.

5. **What document type?** Create a new document type `DEMAND_LETTER` (or reuse an existing category in the package checklist).

---

## Proposed Approach

### Option A — Frontend-triggered save (simpler to start)
After the agent responds in `AgentSidebar.vue`:
- If the query matched demand keywords and the response is substantial, show a "Save as Demand Letter" button in the chat alongside the response.
- User clicks → frontend calls `POST /documents/demand-letter` with the text, clientId, fileNumberId.
- Backend saves to S3 + creates DynamoDB document record + attaches to the demand package.

**Pro:** No ambiguity about response type; user confirms before saving.
**Con:** Extra user step; could miss auto-save.

### Option B — Backend auto-save (preferred by user intent)
`agentController.js`:
- After invoking the supervisor and receiving the response, check if `fileNumberId` is set and the response text is over a threshold length (e.g. 2000 chars) AND the query contains demand keywords.
- If so, save the narrative to S3 + DynamoDB automatically and return a flag in the response (`{ answer: '...', savedAsDemandLetter: true, documentId: '...' }`).
- Frontend shows a confirmation in the sidebar: "Demand letter saved to your package."

**Pro:** Seamless; no extra user action.
**Con:** Heuristic-based detection could false-positive on long chat responses.

---

## Steps To Complete

### Step 1 — Backend: Add `saveDemandLetter` function
File: `backend/src/controllers/documentController.js` (or a new `demandLetterController.js`)

- Accept: `{ text, clientId, fileNumber, fileNumberId }`
- Write text to S3: `clients/{clientId}/file-numbers/{fileNumber}/docs/demand-letter-{fileNumber}.txt`
- Create DynamoDB document record with `documentType: 'DEMAND_LETTER'`
- Return `documentId`

### Step 2 — Backend: Wire save into agentController.js
File: `backend/src/controllers/agentController.js`

- After receiving agent response, detect demand narrative (keyword check on query + response length threshold)
- If match and `fileNumberId` present: call `saveDemandLetter`
- Include `{ savedAsDemandLetter: true, documentId }` in response JSON alongside `answer`

### Step 3 — Frontend: Show save confirmation in sidebar
File: `src/components/AgentSidebar.vue`

- If response includes `savedAsDemandLetter: true`, append a success notice below the agent message: "Demand letter saved to your package. [View Package →]" (link to PackageDetail)
- No other frontend changes needed for auto-save path

### Step 4 — Demand Package view: Show demand letter document
File: `src/pages/PackageDetailPage.vue` and/or `WorkflowPage.vue`

- Documents of type `DEMAND_LETTER` should appear in the package document list
- Consider a distinct label or icon to differentiate from uploaded documents

### Step 5 — Test end-to-end
1. Open a file number that has extracted documents
2. Ask the agent: "draft a demand narrative"
3. Verify narrative appears in chat
4. Verify demand letter document appears in the demand package
5. Verify document is downloadable / viewable

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/controllers/agentController.js` | Agent invocation — add save-after-response logic |
| `backend/src/controllers/documentController.js` | Reference for S3 + DynamoDB document save pattern |
| `src/components/AgentSidebar.vue` | Show save confirmation + package link |
| `src/pages/PackageDetailPage.vue` | Display demand letter in package document list |
| `src/pages/WorkflowPage.vue` | May also need to show DEMAND_LETTER type |

## Existing Agent IDs (do not change)
- Supervisor: `DWVZ2DBY1S` / `KAVUSSELUT`
- Chat sub-agent: `V5DWKNJJJ2` / `KDISPTDPE4`
- Demand sub-agent: `IBOOSS6KQ5` / `KG4FN2OZAK`

---

## Pending Cleanup (from previous task)
- **Step 7 (deferred):** Remove the DEMAND PACKAGE NARRATIVE section from `backend/scripts/update-agent-instructions.js` — it now lives exclusively in the demand sub-agent. Do this after confirming the full save flow works.
