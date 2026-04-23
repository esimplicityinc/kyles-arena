/**
 * SHINE LLM Service - Claude Integration for Conversational Responses
 * 
 * Provides natural language summarization of search results using Claude.
 * Gracefully degrades if API key is not configured.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

let client = null;
let isAvailable = false;

/**
 * Initialize the Anthropic client
 * Called once on module load
 */
function initializeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.error('[LLM Service] ANTHROPIC_API_KEY not configured - Claude integration disabled');
    isAvailable = false;
    return;
  }

  try {
    client = new Anthropic({ apiKey });
    isAvailable = true;
    console.error('[LLM Service] Claude integration enabled');
  } catch (error) {
    console.error('[LLM Service] Failed to initialize Anthropic client:', error.message);
    isAvailable = false;
  }
}

// Initialize on module load
initializeClient();

/**
 * Check if the LLM service is available
 */
export function isLLMAvailable() {
  return isAvailable;
}

/**
 * Format search results for the LLM prompt
 */
function formatResultsForPrompt(searchResults) {
  if (!searchResults.results || searchResults.results.length === 0) {
    return 'No results found.';
  }

  const formattedResults = searchResults.results.slice(0, 10).map((result, index) => {
    const parts = [
      `${index + 1}. [${result.source}] ${result.title}`,
    ];

    if (result.description) {
      parts.push(`   Description: ${result.description.substring(0, 200)}${result.description.length > 200 ? '...' : ''}`);
    }

    if (result.author) {
      parts.push(`   Author: ${result.author}`);
    }

    if (result.lastModified) {
      parts.push(`   Last Modified: ${result.lastModified}`);
    }

    if (result.status) {
      parts.push(`   Status: ${result.status}`);
    }

    if (result.issueKey) {
      parts.push(`   Issue: ${result.issueKey}`);
    }

    if (result.relevanceScore !== undefined) {
      parts.push(`   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`);
    }

    return parts.join('\n');
  }).join('\n\n');

  return formattedResults;
}

/**
 * Format conversation history for the LLM
 */
function formatConversationHistory(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return '';
  }

  return conversationHistory.map(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    return `${role}: ${msg.content}`;
  }).join('\n\n');
}

/**
 * Build the system prompt for Claude
 */
function buildSystemPrompt() {
  return `You are SHINE, an intelligent enterprise search assistant. Your job is to help users find and understand information across their organization's tools (SharePoint, GitHub, Jira, Confluence).

When summarizing search results:
- Be concise and helpful (2-4 sentences for the summary)
- Highlight the most relevant results and explain why they're relevant
- If the user asked for "latest" or recent items, emphasize recency
- Mention authors or experts when relevant to the query
- If results come from multiple sources, note this diversity
- Handle cases with no results gracefully - suggest alternative queries

When suggesting follow-up questions:
- Provide 2-4 relevant follow-up questions the user might want to ask
- Base suggestions on the query context and results found
- Make questions specific and actionable

Always maintain a professional but friendly tone.`;
}

/**
 * Build the user prompt for Claude
 */
function buildUserPrompt(query, searchResults, conversationHistory) {
  const parts = [];

  // Add conversation context if available
  if (conversationHistory && conversationHistory.length > 0) {
    parts.push('Previous conversation:');
    parts.push(formatConversationHistory(conversationHistory));
    parts.push('---');
  }

  // Add the current query
  parts.push(`User's query: "${query}"`);

  // Add search metadata
  parts.push(`\nSearch info:`);
  parts.push(`- Sources searched: ${searchResults.intent?.detectedSources?.join(', ') || 'unknown'}`);
  parts.push(`- Intent confidence: ${searchResults.intent?.confidence ? (searchResults.intent.confidence * 100).toFixed(0) + '%' : 'unknown'}`);
  parts.push(`- Total results found: ${searchResults.totalResults || 0}`);
  parts.push(`- Search duration: ${searchResults.searchDuration?.toFixed(2) || 'unknown'}s`);

  // Add source status
  if (searchResults.sourceStatus) {
    const sourceInfo = Object.entries(searchResults.sourceStatus)
      .filter(([_, status]) => status.searched)
      .map(([source, status]) => `${source}: ${status.resultCount} results${status.error ? ` (error: ${status.error})` : ''}`)
      .join(', ');
    parts.push(`- Source breakdown: ${sourceInfo}`);
  }

  // Add the results
  parts.push('\nSearch results:');
  parts.push(formatResultsForPrompt(searchResults));

  // Add instructions
  parts.push('\nPlease provide:');
  parts.push('1. A helpful summary of what was found (2-4 sentences)');
  parts.push('2. 2-4 follow-up questions the user might want to ask');
  parts.push('\nRespond in JSON format: { "summary": "...", "followUpSuggestions": ["...", "..."] }');

  return parts.join('\n');
}

/**
 * Parse Claude's response into structured format
 */
function parseResponse(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Unable to generate summary.',
        followUpSuggestions: Array.isArray(parsed.followUpSuggestions) 
          ? parsed.followUpSuggestions 
          : [],
      };
    }
  } catch (error) {
    console.error('[LLM Service] Failed to parse JSON response:', error.message);
  }

  // Fallback: use the raw text as summary
  return {
    summary: responseText.substring(0, 500),
    followUpSuggestions: [],
  };
}

/**
 * Generate a conversational response using Claude
 * 
 * @param {string} query - The user's search query
 * @param {object} searchResults - The search results from the orchestrator
 * @param {array} conversationHistory - Optional array of previous messages
 * @returns {Promise<{summary: string, followUpSuggestions: string[]}>}
 */
export async function generateResponse(query, searchResults, conversationHistory = []) {
  if (!isAvailable || !client) {
    return {
      summary: null,
      followUpSuggestions: [],
      llmError: 'LLM service not available',
    };
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(query, searchResults, conversationHistory);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const responseText = response.content[0]?.text || '';
    const parsed = parseResponse(responseText);

    return {
      ...parsed,
      llmError: null,
    };
  } catch (error) {
    console.error('[LLM Service] Error generating response:', error.message);
    return {
      summary: null,
      followUpSuggestions: [],
      llmError: error.message,
    };
  }
}

/**
 * Re-initialize the client (useful if API key is set after module load)
 */
export function reinitialize() {
  initializeClient();
}
