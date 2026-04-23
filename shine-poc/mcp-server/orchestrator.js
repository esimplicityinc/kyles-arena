#!/usr/bin/env node

/**
 * SHINE Orchestrator - Intelligent Multi-Source Search
 * 
 * The "brain" of SHINE that:
 * 1. Receives natural language queries
 * 2. Detects intent to determine relevant sources
 * 3. Searches sources in parallel with timeout handling
 * 4. Aggregates, deduplicates, and ranks results
 * 5. Returns unified results to the client
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Import search functions from individual servers
import { searchSharePoint, checkSharePointAvailable } from './sharepoint-server.js';
import { searchGitHub, checkGitHubAvailable } from './github-server.js';
import { searchJira, checkJiraAvailable } from './jira-server.js';
import { searchConfluence, checkConfluenceAvailable } from './confluence-server.js';

// Import LLM service for conversational responses
import { generateResponse, isLLMAvailable } from './llm-service.js';

// Constants
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RESULTS = 10;
const VALID_SOURCES = ['sharepoint', 'github', 'jira', 'confluence'];

// Source-specific timeout overrides (SharePoint is slower due to Microsoft Graph API)
const SOURCE_TIMEOUTS = {
  sharepoint: 20000,  // 20 seconds - Graph API + token refresh can be slow
  github: 10000,      // 10 seconds
  jira: 10000,        // 10 seconds
  confluence: 10000,  // 10 seconds
};

/**
 * Detect which sources are relevant for a given query
 * Returns sources with confidence scores and reasoning
 */
function detectSources(query) {
  const lower = query.toLowerCase();
  const sources = [];
  const reasons = [];

  // Code/technical queries -> GitHub
  if (/code|function|class|api|repo|repository|implementation|bug fix|pull request|pr|commit|branch|module|component|library|sdk|package/.test(lower)) {
    sources.push('github');
    reasons.push('code/technical terms detected');
  }

  // Documents/policies -> SharePoint
  if (/document|policy|template|sow|proposal|contract|guide|process|procedure|onboard|form|pdf|word|excel|powerpoint|presentation|spreadsheet|handbook|manual|agreement|memo|report/.test(lower)) {
    sources.push('sharepoint');
    reasons.push('document/policy terms detected');
  }

  // Tasks/issues -> Jira
  if (/ticket|issue|task|bug|story|epic|sprint|jira|assigned|status|blocker|backlog|kanban|scrum|roadmap|milestone|release|version/.test(lower)) {
    sources.push('jira');
    reasons.push('task/issue terms detected');
  }

  // Wiki/knowledge base -> Confluence
  if (/wiki|confluence|knowledge|documentation|how.?to|tutorial|runbook|playbook|guide|faq|best.?practice|architecture|design|standard|spec|specification/.test(lower)) {
    sources.push('confluence');
    reasons.push('wiki/knowledge terms detected');
  }

  // Project names might be in any source
  if (/project|initiative|program|phase|deliverable/.test(lower)) {
    if (!sources.includes('sharepoint')) {
      sources.push('sharepoint');
      reasons.push('project terms -> documents');
    }
    if (!sources.includes('jira')) {
      sources.push('jira');
      reasons.push('project terms -> issues');
    }
    if (!sources.includes('confluence')) {
      sources.push('confluence');
      reasons.push('project terms -> wiki');
    }
  }

  // People queries -> try all sources
  if (/who|team|assigned to|worked on|created by|owner|author|contributor|maintainer/.test(lower)) {
    if (!sources.includes('sharepoint')) {
      sources.push('sharepoint');
      reasons.push('people query -> documents');
    }
    if (!sources.includes('github')) {
      sources.push('github');
      reasons.push('people query -> code');
    }
    if (!sources.includes('jira')) {
      sources.push('jira');
      reasons.push('people query -> issues');
    }
    if (!sources.includes('confluence')) {
      sources.push('confluence');
      reasons.push('people query -> wiki');
    }
  }

  // Calculate confidence based on how specific the match was
  const confidence = sources.length > 0 
    ? Math.min(0.95, 0.6 + (reasons.length * 0.1))
    : 0.5;

  // Default: search all if no specific intent detected
  const finalSources = sources.length > 0 ? [...new Set(sources)] : ['sharepoint', 'github', 'jira', 'confluence'];
  const reasoning = reasons.length > 0 
    ? reasons.join('; ')
    : 'No specific intent detected - searching all sources';

  return {
    sources: finalSources,
    confidence,
    reasoning,
  };
}

/**
 * Execute a search with timeout
 */
async function searchWithTimeout(searchFn, query, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return Promise.race([
    searchFn(query, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Execute a search with retry logic
 * Retries once on timeout or transient errors
 */
async function searchWithRetry(searchFn, query, options, timeoutMs, maxRetries = 1) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // On retry, use a slightly longer timeout
      const effectiveTimeout = attempt > 0 ? timeoutMs * 1.5 : timeoutMs;
      return await searchWithTimeout(searchFn, query, options, effectiveTimeout);
    } catch (error) {
      lastError = error;
      
      // Only retry on timeout or network errors
      const isRetryable = error.message.includes('timeout') || 
                         error.message.includes('network') ||
                         error.message.includes('ECONNREFUSED');
      
      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }
      
      // Brief delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Retrying search (attempt ${attempt + 2}/${maxRetries + 1})...`);
    }
  }
  
  throw lastError;
}

/**
 * Calculate relevance score for a result based on query terms
 */
function calculateRelevanceScore(result, query, sourceWeight = 1.0) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return 0.5 * sourceWeight;

  const searchableText = [
    result.title || '',
    result.description || '',
    result.path || '',
    result.issueKey || '',
    result.project || '',
    result.repo || '',
  ].join(' ').toLowerCase();

  let matchCount = 0;
  for (const term of queryTerms) {
    if (searchableText.includes(term)) {
      matchCount++;
    }
  }

  const termScore = matchCount / queryTerms.length;
  
  // Boost for exact title match
  const titleBoost = result.title?.toLowerCase().includes(query.toLowerCase()) ? 0.2 : 0;
  
  // Use any existing score from the source
  const sourceScore = result.score ? Math.min(result.score / 100, 1) : 0;

  return Math.min(1, (termScore * 0.5 + sourceScore * 0.3 + titleBoost) * sourceWeight);
}

/**
 * Deduplicate results based on URL
 */
function deduplicateResults(results) {
  const seen = new Map();
  
  for (const result of results) {
    const key = result.url?.toLowerCase() || `${result.source}-${result.title}`;
    
    if (!seen.has(key) || result.relevanceScore > seen.get(key).relevanceScore) {
      seen.set(key, result);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Check source availability
 */
async function getSourceStatus() {
  const status = {};
  
  const checks = [
    { name: 'sharepoint', check: checkSharePointAvailable },
    { name: 'github', check: checkGitHubAvailable },
    { name: 'jira', check: checkJiraAvailable },
    { name: 'confluence', check: checkConfluenceAvailable },
  ];

  await Promise.all(
    checks.map(async ({ name, check }) => {
      try {
        const available = await check();
        status[name] = {
          available,
          error: available ? null : 'Credentials not configured',
        };
      } catch (error) {
        status[name] = {
          available: false,
          error: error.message,
        };
      }
    })
  );

  return status;
}

/**
 * Main unified search function
 */
async function unifiedSearch(query, options = {}) {
  const startTime = Date.now();
  const { 
    sources: requestedSources, 
    maxResults = DEFAULT_MAX_RESULTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    generateSummary = true,
    conversationHistory = [],
  } = options;

  // Detect intent if sources not specified
  const intent = detectSources(query);
  const sourcesToSearch = requestedSources && requestedSources.length > 0
    ? requestedSources.filter(s => VALID_SOURCES.includes(s.toLowerCase()))
    : intent.sources;

  // Build search tasks
  const searchTasks = [];
  const searchResults = {
    sharepoint: { results: [], error: null, searched: false },
    github: { results: [], error: null, searched: false },
    jira: { results: [], error: null, searched: false },
    confluence: { results: [], error: null, searched: false },
  };

  // Calculate source weights based on intent
  const sourceWeights = {};
  for (const source of VALID_SOURCES) {
    sourceWeights[source] = intent.sources.includes(source) ? 1.0 : 0.7;
  }

  if (sourcesToSearch.includes('sharepoint')) {
    searchResults.sharepoint.searched = true;
    searchTasks.push(
      searchWithRetry(searchSharePoint, query, { size: maxResults }, SOURCE_TIMEOUTS.sharepoint || timeoutMs)
        .then(results => {
          searchResults.sharepoint.results = results.map(r => ({
            ...r,
            relevanceScore: calculateRelevanceScore(r, query, sourceWeights.sharepoint),
          }));
        })
        .catch(error => {
          searchResults.sharepoint.error = error.message;
        })
    );
  }

  if (sourcesToSearch.includes('github')) {
    searchResults.github.searched = true;
    searchTasks.push(
      searchWithRetry(searchGitHub, query, { maxResults }, SOURCE_TIMEOUTS.github || timeoutMs)
        .then(results => {
          searchResults.github.results = results.map(r => ({
            ...r,
            relevanceScore: calculateRelevanceScore(r, query, sourceWeights.github),
          }));
        })
        .catch(error => {
          searchResults.github.error = error.message;
        })
    );
  }

  if (sourcesToSearch.includes('jira')) {
    searchResults.jira.searched = true;
    searchTasks.push(
      searchWithRetry(searchJira, query, { maxResults }, SOURCE_TIMEOUTS.jira || timeoutMs)
        .then(results => {
          searchResults.jira.results = results.map(r => ({
            ...r,
            relevanceScore: calculateRelevanceScore(r, query, sourceWeights.jira),
          }));
        })
        .catch(error => {
          searchResults.jira.error = error.message;
        })
    );
  }

  if (sourcesToSearch.includes('confluence')) {
    searchResults.confluence.searched = true;
    searchTasks.push(
      searchWithRetry(searchConfluence, query, { maxResults }, SOURCE_TIMEOUTS.confluence || timeoutMs)
        .then(results => {
          searchResults.confluence.results = results.map(r => ({
            ...r,
            relevanceScore: calculateRelevanceScore(r, query, sourceWeights.confluence),
          }));
        })
        .catch(error => {
          searchResults.confluence.error = error.message;
        })
    );
  }

  // Execute all searches in parallel
  await Promise.all(searchTasks);

  // Combine all results
  const allResults = [
    ...searchResults.sharepoint.results,
    ...searchResults.github.results,
    ...searchResults.jira.results,
    ...searchResults.confluence.results,
  ];

  // Deduplicate and sort by relevance
  const dedupedResults = deduplicateResults(allResults);
  dedupedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const searchDuration = (Date.now() - startTime) / 1000;

  // Build source status
  const sourceStatus = {};
  for (const source of VALID_SOURCES) {
    if (searchResults[source].searched) {
      sourceStatus[source] = {
        searched: true,
        resultCount: searchResults[source].results.length,
        error: searchResults[source].error,
      };
    }
  }

  const response = {
    query,
    intent: {
      detectedSources: intent.sources,
      confidence: intent.confidence,
      reasoning: intent.reasoning,
    },
    results: dedupedResults,
    totalResults: dedupedResults.length,
    searchDuration,
    sourceStatus,
  };

  // Generate conversational summary if enabled and LLM is available
  if (generateSummary && isLLMAvailable()) {
    try {
      const llmResponse = await generateResponse(query, response, conversationHistory);
      response.summary = llmResponse.summary;
      response.followUpSuggestions = llmResponse.followUpSuggestions;
      if (llmResponse.llmError) {
        response.llmError = llmResponse.llmError;
      }
    } catch (error) {
      console.error('LLM generation failed:', error.message);
      response.llmError = error.message;
    }
  }

  return response;
}

/**
 * Ask a question about organizational knowledge
 * This is a semantic wrapper around search that provides context
 */
async function askQuestion(question, context = '') {
  const searchQuery = context ? `${question} ${context}` : question;
  const searchResult = await unifiedSearch(searchQuery, { maxResults: 15 });

  return {
    question,
    context: context || null,
    searchQuery,
    ...searchResult,
    summary: `Found ${searchResult.totalResults} relevant items across ${
      Object.keys(searchResult.sourceStatus).filter(s => searchResult.sourceStatus[s].searched).length
    } sources in ${searchResult.searchDuration.toFixed(2)}s`,
  };
}

// Create the MCP server
const server = new Server(
  {
    name: 'shine-orchestrator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'shine_search',
        description: 'Universal search across SharePoint, GitHub, and Jira. Automatically detects which sources are most relevant based on your query. Use this to find documents, code, issues, and other organizational content.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query - keywords, phrases, or questions',
            },
            sources: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['sharepoint', 'github', 'jira', 'confluence'],
              },
              description: 'Optional: Limit search to specific sources. If not provided, sources are auto-detected based on query intent.',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum results per source (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'shine_ask',
        description: 'Ask a question about organizational knowledge. Searches across all relevant sources and returns context-rich results. Best for finding specific information or understanding concepts.',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Your question in natural language',
            },
            context: {
              type: 'string',
              description: 'Optional: Additional context to help focus the search (e.g., project name, team, timeframe)',
            },
          },
          required: ['question'],
        },
      },
      {
        name: 'shine_status',
        description: 'Check which data sources are available and configured. Use this to verify connectivity before searching.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'shine_search': {
        const result = await unifiedSearch(args.query, {
          sources: args.sources,
          maxResults: args.maxResults || DEFAULT_MAX_RESULTS,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'shine_ask': {
        const result = await askQuestion(args.question, args.context);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'shine_status': {
        const status = await getSourceStatus();

        const availableCount = Object.values(status).filter(s => s.available).length;
        const summary = `${availableCount}/${Object.keys(status).length} sources available`;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary,
                sources: status,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server (only when run directly)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SHINE Orchestrator MCP Server running');
}

// Only start the server if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

// Export for testing
export {
  detectSources,
  unifiedSearch,
  askQuestion,
  getSourceStatus,
  isLLMAvailable,
};
