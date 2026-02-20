const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;

// Use AWS SDK v3 Bedrock Agent Runtime
let bedrockAgentClient;
try {
  bedrockAgentClient = new BedrockAgentRuntimeClient({ region: 'us-east-1' });
} catch (e) {
  console.warn('BedrockAgentRuntime not available:', e.message);
}

exports.invokeAgent = async (req, res) => {
  try {
    const { query, clientId, fileNumber } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!AGENT_ID || !AGENT_ALIAS_ID) {
      return res.status(500).json({ error: 'Bedrock agent not configured', agentId: AGENT_ID, aliasId: AGENT_ALIAS_ID });
    }

    console.log('Agent config:', { AGENT_ID, AGENT_ALIAS_ID });
    console.log('Invoking agent with query:', query);

    // Prepare context if clientId/fileNumber provided
    const context = clientId || fileNumber
      ? `Context: Client ID: ${clientId}, File Number: ${fileNumber}`
      : '';
    const fullQuery = context ? `${context}\n\nQuery: ${query}` : query;

    const response = await bedrockAgentClient.send(
      new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId: `session-${Date.now()}`,
        inputText: fullQuery,
      })
    );

    console.log('Agent response received, type:', typeof response, 'keys:', Object.keys(response || {}));

    // Collect response from the stream
    let responseText = '';
    
    if (response.completion) {
      console.log('Reading response from completion stream');
      responseText = await streamToString(response.completion);
    } else if (response.output) {
      console.log('Response has output field');
      responseText = String(response.output);
    } else {
      console.log('Fallback: converting entire response to JSON');
      responseText = JSON.stringify(response, null, 2);
    }

    console.log('Response text length:', responseText.length, 'first 300 chars:', responseText.substring(0, 300));

    // Parse the response if it's JSON
    try {
      const parsed = JSON.parse(responseText);
      if (parsed.output && typeof parsed.output === 'string') {
        responseText = parsed.output;
      } else if (parsed.response) {
        responseText = parsed.response;
      } else if (parsed.message) {
        responseText = parsed.message;
      } else if (parsed.content) {
        responseText = parsed.content;
      } else {
        responseText = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Not JSON, use as-is
      console.log('Response is not JSON:', responseText.substring(0, 200));
    }

    console.log('Final response text:', responseText.substring(0, 200));

    res.json({
      answer: responseText,
      query,
      clientId,
      fileNumber,
    });
  } catch (err) {
    console.error('Bedrock agent error:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
      fullError: err
    });
    res.status(500).json({ 
      error: 'Agent invocation failed', 
      details: err.message,
      code: err.code,
      statusCode: err.statusCode
    });
  }
};

// Helper function to convert stream to string for SDK v3
const streamToString = async (stream) => {
  const chunks = [];
  
  if (!stream) return '';
  
  // SDK v3 streams are async iterables
  if (stream[Symbol.asyncIterator]) {
    console.log('Stream is async iterable, consuming events');
    let eventCount = 0;
    
    for await (const event of stream) {
      eventCount++;
      console.log(`[Event ${eventCount}] received:`, Object.keys(event || {}));
      
      // Handle various event types
      if (event.chunk && event.chunk.bytes) {
        const text = Buffer.from(event.chunk.bytes).toString('utf-8');
        console.log(`[Event ${eventCount}] extracted text (${text.length} chars):`, text.substring(0, 100));
        chunks.push(text);
      } else if (event.contentBlockDelta && event.contentBlockDelta.delta && event.contentBlockDelta.delta.text) {
        const text = event.contentBlockDelta.delta.text;
        console.log(`[Event ${eventCount}] extracted from delta:`, text.substring(0, 100));
        chunks.push(text);
      }
    }
    
    console.log(`Stream complete. Total events: ${eventCount}, total chunks: ${chunks.length}`);
  } else {
    console.log('Stream is not async iterable, attempting direct access');
  }
  
  return chunks.join('');
};
