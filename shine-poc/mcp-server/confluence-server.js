#!/usr/bin/env node

/**
 * SHINE MCP Server - Confluence Tools
 * Provides Confluence content search and page access via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

/**
 * Get Confluence configuration from environment
 * Reuses Jira credentials (same Atlassian API tokens)
 */
function getConfig() {
  const email = process.env.VITE_JIRA_EMAIL;
  const apiToken = process.env.VITE_JIRA_API_TOKEN;
  const baseUrl = process.env.VITE_CONFLUENCE_BASE_URL || 'https://esimplicity.atlassian.net/wiki';

  if (!email) {
    throw new Error('Atlassian email not configured. Set VITE_JIRA_EMAIL in .env file.');
  }

  if (!apiToken) {
    throw new Error('Atlassian API token not configured. Set VITE_JIRA_API_TOKEN in .env file.');
  }

  return { email, apiToken, baseUrl };
}

/**
 * Create Basic Auth header for Confluence API
 */
function createAuthHeader(email, apiToken) {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Create headers for Confluence API requests
 */
function createHeaders() {
  const { email, apiToken } = getConfig();
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': createAuthHeader(email, apiToken),
    'User-Agent': 'SHINE-MCP-Server/1.0.0',
  };
}

/**
 * Handle Confluence API errors with helpful messages
 */
function handleApiError(response, operation) {
  const statusCode = response.status;
  const statusText = response.statusText;
  
  console.error(`[Confluence API Error] ${statusCode} ${statusText} for: ${operation}`);
  
  if (statusCode === 401) {
    throw new Error('Confluence authentication failed. Check your VITE_JIRA_EMAIL and VITE_JIRA_API_TOKEN.');
  }
  if (statusCode === 403) {
    throw new Error('Confluence API access forbidden. Check your API token permissions or account access.');
  }
  if (statusCode === 404) {
    throw new Error(`Resource not found: ${operation}`);
  }
  if (statusCode === 400) {
    throw new Error(`Invalid request: ${operation}`);
  }
  if (statusCode === 429) {
    const retryAfter = response.headers.get('retry-after');
    const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
    throw new Error(`Confluence API rate limit exceeded.${retryMsg}`);
  }
  throw new Error(`Confluence ${operation} failed: ${statusCode} ${statusText}`);
}

/**
 * Check if query looks like CQL (Confluence Query Language)
 * CQL uses operators like =, ~, AND, OR, etc.
 */
function isCqlQuery(query) {
  const cqlPatterns = [
    /\s+(=|!=|~|!~|>|<|>=|<=)\s+/i,
    /^(text|title|type|space|creator|contributor|label|ancestor|parent|id)\s*(=|~|!=)/i,
    /\s+(AND|OR|ORDER BY)\s+/i,
  ];
  return cqlPatterns.some(pattern => pattern.test(query));
}

/**
 * Build CQL query from parameters
 * Uses simpler, more compatible CQL syntax for Confluence Cloud
 */
function buildCql(query, options = {}) {
  const { spaceKey, contentType } = options;
  const conditions = [];

  // If query looks like CQL, use it directly; otherwise wrap in text search
  if (query) {
    if (isCqlQuery(query)) {
      conditions.push(`(${query})`);
    } else {
      // Escape backslashes first, then quotes
      const escapedQuery = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      // Use title OR text match for better results on Confluence Cloud
      conditions.push(`(title ~ "${escapedQuery}" OR text ~ "${escapedQuery}")`);
    }
  }

  if (spaceKey) {
    conditions.push(`space = "${spaceKey}"`);
  }

  if (contentType && contentType !== 'all') {
    // Use quotes around content type value
    conditions.push(`type = "${contentType}"`);
  }

  return conditions.length > 0 ? conditions.join(' AND ') : 'type = page';
}

/**
 * Extract plain text from Confluence storage format (basic HTML-like content)
 */
function extractTextFromStorage(storageContent) {
  if (!storageContent) return '';
  
  // Remove XML/HTML tags and decode basic entities
  return storageContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Transform Confluence search result to consistent result format
 */
function transformSearchResult(result, baseUrl) {
  const content = result.content || result;
  const space = content.space || result.resultGlobalContainer;
  
  // Extract webui link
  let webUrl = '';
  if (content._links?.webui) {
    webUrl = `${baseUrl}${content._links.webui}`;
  } else if (result._links?.webui) {
    webUrl = `${baseUrl}${result._links.webui}`;
  }

  return {
    title: result.title || content.title || 'Untitled',
    description: result.excerpt ? extractTextFromStorage(result.excerpt) : '',
    url: webUrl,
    source: 'Confluence',
    type: content.type || result.content?.type || 'page',
    spaceKey: space?.key || null,
    spaceName: space?.name || space?.title || null,
    lastModified: content.version?.when || result.lastModified || null,
    author: content.version?.by?.displayName || result.lastModifier?.displayName || null,
    pageId: content.id || result.content?.id || null,
  };
}

/**
 * Transform Confluence page to consistent result format
 */
function transformPage(page, baseUrl) {
  let webUrl = '';
  if (page._links?.webui) {
    webUrl = `${baseUrl}${page._links.webui}`;
  }

  // Extract body content if available
  let bodyContent = '';
  if (page.body?.storage?.value) {
    bodyContent = extractTextFromStorage(page.body.storage.value);
  }

  return {
    title: page.title || 'Untitled',
    description: bodyContent.substring(0, 500) + (bodyContent.length > 500 ? '...' : ''),
    url: webUrl,
    source: 'Confluence',
    type: page.type || 'page',
    spaceKey: page.spaceId || null,
    pageId: page.id,
    status: page.status || null,
    version: page.version?.number || null,
    lastModified: page.version?.createdAt || null,
    author: page.version?.authorId || null,
    bodyContent: bodyContent,
  };
}

/**
 * Transform Confluence space to consistent result format
 */
function transformSpace(space, baseUrl) {
  let webUrl = '';
  if (space._links?.webui) {
    webUrl = `${baseUrl}${space._links.webui}`;
  }

  return {
    title: space.name,
    description: space.description?.plain?.value || '',
    url: webUrl,
    source: 'Confluence',
    type: 'space',
    spaceKey: space.key,
    spaceId: space.id,
    status: space.status || null,
    homepageId: space.homepageId || null,
  };
}

/**
 * Search Confluence content using CQL
 * Supports both the v1 search API and fallback to v2 pages API
 */
async function searchContent(query, options = {}) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();
  const { spaceKey, contentType = 'all', maxResults = 25 } = options;

  // Ensure baseUrl doesn't have a trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  const cql = buildCql(query, { spaceKey, contentType });
  
  if (!cql) {
    throw new Error('Search query is required.');
  }

  // Log the CQL for debugging
  console.error(`[Confluence Search] CQL: ${cql}`);

  const params = new URLSearchParams({
    cql,
    limit: String(Math.min(maxResults, 100)),
  });

  const url = `${cleanBaseUrl}/rest/api/search?${params.toString()}`;
  console.error(`[Confluence Search] URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  // Log response status for debugging
  console.error(`[Confluence Search] Response status: ${response.status}`);

  if (!response.ok) {
    // Try to get more error details from the response body
    let errorDetails = '';
    try {
      const errorBody = await response.text();
      console.error(`[Confluence Search] Error response: ${errorBody}`);
      errorDetails = errorBody;
    } catch {
      // Ignore parse errors
    }

    // If CQL search fails with 400, try fallback to v2 API for simple text searches
    if (response.status === 400 && !isCqlQuery(query)) {
      console.error('[Confluence Search] CQL search failed, trying v2 API fallback...');
      return searchContentV2(query, options);
    }

    handleApiError(response, `content search. CQL: ${cql}`);
  }

  const data = await response.json();

  return {
    total: data.totalSize || 0,
    results: (data.results || []).map(result => transformSearchResult(result, cleanBaseUrl)),
    cql,
  };
}

/**
 * Fallback search using Confluence v2 API (pages endpoint with title filter)
 * Used when CQL search fails
 */
async function searchContentV2(query, options = {}) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();
  const { spaceKey, maxResults = 25 } = options;

  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  console.error(`[Confluence Search v2] Searching for: ${query}`);

  // Build v2 API URL - uses title parameter for filtering
  const params = new URLSearchParams({
    limit: String(Math.min(maxResults, 100)),
    'body-format': 'storage',
  });

  // Add title filter if we have a query
  if (query) {
    params.set('title', query);
  }

  // Add space filter if specified
  if (spaceKey) {
    // Need to get space ID from space key first, or filter results after
    // For now, we'll filter results after fetching
  }

  const url = `${cleanBaseUrl}/api/v2/pages?${params.toString()}`;
  console.error(`[Confluence Search v2] URL: ${url}`);

  const response = await fetch(url, { headers });

  console.error(`[Confluence Search v2] Response status: ${response.status}`);

  if (!response.ok) {
    handleApiError(response, 'content search (v2 fallback)');
  }

  const data = await response.json();
  let results = data.results || [];

  // Filter by space key if specified (v2 API doesn't support direct space filtering)
  if (spaceKey && results.length > 0) {
    results = results.filter(page => page.spaceId === spaceKey);
  }

  return {
    total: results.length,
    results: results.map(page => transformPage(page, cleanBaseUrl)),
    searchMethod: 'v2-api-fallback',
  };
}

/**
 * Get a specific Confluence page by ID
 */
async function getPage(pageId) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();

  // Validate page ID format (should be numeric)
  if (!/^\d+$/.test(pageId)) {
    throw new Error(`Invalid page ID format: ${pageId}. Expected a numeric ID.`);
  }

  const params = new URLSearchParams({
    'body-format': 'storage',
  });

  const url = `${baseUrl}/api/v2/pages/${pageId}?${params.toString()}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response, `get page ${pageId}`);
  }

  const page = await response.json();
  return transformPage(page, baseUrl);
}

/**
 * List all accessible Confluence spaces
 */
async function listSpaces(options = {}) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();
  const { maxResults = 50 } = options;

  const params = new URLSearchParams({
    limit: String(Math.min(maxResults, 100)),
  });

  const url = `${baseUrl}/api/v2/spaces?${params.toString()}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response, 'list spaces');
  }

  const data = await response.json();

  return (data.results || []).map(space => transformSpace(space, baseUrl));
}

// Create the MCP server
const server = new Server(
  {
    name: 'shine-confluence',
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
        name: 'confluence_search',
        description: 'Search for Confluence content using text search or CQL (Confluence Query Language). Use this to find pages, blog posts, and other content. If you provide plain text, it will be converted to a text search; if you provide CQL syntax, it will be used directly.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - either plain text (auto-converted to CQL) or CQL syntax (e.g., "space = DOCS AND text ~ term")',
            },
            spaceKey: {
              type: 'string',
              description: 'Filter by space key (e.g., "DOCS", "TEAM")',
            },
            contentType: {
              type: 'string',
              enum: ['page', 'blogpost', 'all'],
              description: 'Filter by content type',
              default: 'all',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 100)',
              default: 25,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'confluence_get_page',
        description: 'Get detailed information about a specific Confluence page by its ID. Use this when you have a page ID and need its full content.',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The Confluence page ID (numeric, e.g., "123456789")',
            },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'confluence_list_spaces',
        description: 'List all Confluence spaces accessible to the user. Use this to discover available spaces and their keys.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of spaces to return (default: 50, max: 100)',
              default: 50,
            },
          },
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
      case 'confluence_search': {
        const result = await searchContent(args.query, {
          spaceKey: args.spaceKey,
          contentType: args.contentType || 'all',
          maxResults: args.maxResults || 25,
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

      case 'confluence_get_page': {
        const result = await getPage(args.pageId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'confluence_list_spaces': {
        const results = await listSpaces({
          maxResults: args.maxResults || 50,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
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

/**
 * Check if Confluence credentials are configured
 */
async function checkConfluenceAvailable() {
  const email = process.env.VITE_JIRA_EMAIL;
  const apiToken = process.env.VITE_JIRA_API_TOKEN;

  if (!email || !apiToken) {
    return false;
  }

  // Validate credentials with a simple API call
  try {
    const { baseUrl } = getConfig();
    const headers = createHeaders();
    const response = await fetch(`${baseUrl}/api/v2/spaces?limit=1`, { headers });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Search Confluence - wrapper for orchestrator compatibility
 * Returns flat array of results (extracts from searchContent response)
 */
async function searchConfluence(query, options = {}) {
  const response = await searchContent(query, options);
  return response.results || [];
}

// Start the server (only when run directly)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SHINE Confluence MCP Server running');
}

// Only start the server if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

// Export functions for orchestrator
export {
  searchConfluence,
  searchContent,
  searchContentV2,
  getPage,
  listSpaces,
  checkConfluenceAvailable,
};
