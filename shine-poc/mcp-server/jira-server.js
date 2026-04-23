#!/usr/bin/env node

/**
 * SHINE MCP Server - Jira Tools
 * Provides Jira issue search and project access via Model Context Protocol
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
 * Get Jira configuration from environment
 */
function getConfig() {
  const email = process.env.VITE_JIRA_EMAIL;
  const apiToken = process.env.VITE_JIRA_API_TOKEN;
  const baseUrl = process.env.VITE_JIRA_BASE_URL || 'https://esimplicity.atlassian.net';

  if (!email) {
    throw new Error('Jira email not configured. Set VITE_JIRA_EMAIL in .env file.');
  }

  if (!apiToken) {
    throw new Error('Jira API token not configured. Set VITE_JIRA_API_TOKEN in .env file.');
  }

  return { email, apiToken, baseUrl };
}

/**
 * Create Basic Auth header for Jira API
 */
function createAuthHeader(email, apiToken) {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Create headers for Jira API requests
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
 * Handle Jira API errors with helpful messages
 */
function handleApiError(response, operation) {
  if (response.status === 401) {
    throw new Error('Jira authentication failed. Check your VITE_JIRA_EMAIL and VITE_JIRA_API_TOKEN.');
  }
  if (response.status === 403) {
    throw new Error('Jira API access forbidden. Check your API token permissions or account access.');
  }
  if (response.status === 404) {
    throw new Error(`Resource not found: ${operation}`);
  }
  if (response.status === 400) {
    throw new Error(`Invalid request: ${operation}. Check your JQL syntax or parameters.`);
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
    throw new Error(`Jira API rate limit exceeded.${retryMsg}`);
  }
  throw new Error(`Jira ${operation} failed: ${response.status} ${response.statusText}`);
}

/**
 * Check if query looks like JQL (contains operators or field names)
 */
function isJqlQuery(query) {
  const jqlPatterns = [
    /\s+(=|!=|~|!~|>|<|>=|<=|in|not in|is|is not)\s+/i,
    /^(project|status|assignee|reporter|issuetype|priority|created|updated|resolution)\s*(=|!=|~|is)/i,
    /\s+(AND|OR|ORDER BY)\s+/i,
  ];
  return jqlPatterns.some(pattern => pattern.test(query));
}

/**
 * Build JQL query from parameters
 */
function buildJql(query, options = {}) {
  const { projectKey, issueType, status } = options;
  const conditions = [];

  // If query looks like JQL, use it directly; otherwise wrap in summary/description search
  if (query) {
    if (isJqlQuery(query)) {
      conditions.push(`(${query})`);
    } else {
      // Text search - escape quotes and search summary + description
      const escapedQuery = query.replace(/"/g, '\\"');
      conditions.push(`(summary ~ "${escapedQuery}" OR description ~ "${escapedQuery}")`);
    }
  }

  if (projectKey) {
    conditions.push(`project = "${projectKey}"`);
  }

  if (issueType) {
    conditions.push(`issuetype = "${issueType}"`);
  }

  if (status) {
    conditions.push(`status = "${status}"`);
  }

  const jql = conditions.length > 0 ? conditions.join(' AND ') : '';
  // New Jira API requires bounded queries - add time filter if no other conditions
  if (jql) {
    return `${jql} ORDER BY updated DESC`;
  } else {
    return 'updated >= -90d ORDER BY updated DESC';
  }
}

/**
 * Transform Jira issue to consistent result format
 */
function transformIssue(issue, baseUrl) {
  const fields = issue.fields || {};
  
  // Extract description text from Atlassian Document Format (ADF)
  let descriptionText = '';
  if (fields.description?.content) {
    descriptionText = extractTextFromAdf(fields.description);
  } else if (typeof fields.description === 'string') {
    descriptionText = fields.description;
  }

  return {
    title: fields.summary || 'Untitled Issue',
    description: descriptionText,
    url: `${baseUrl}/browse/${issue.key}`,
    source: 'Jira',
    type: fields.issuetype?.name?.toLowerCase() || 'issue',
    issueKey: issue.key,
    status: fields.status?.name || 'Unknown',
    priority: fields.priority?.name || null,
    assignee: fields.assignee?.displayName || null,
    reporter: fields.reporter?.displayName || null,
    project: fields.project?.name || 'Unknown Project',
    projectKey: fields.project?.key || null,
    created: fields.created || null,
    updated: fields.updated || null,
  };
}

/**
 * Extract plain text from Atlassian Document Format (ADF)
 */
function extractTextFromAdf(adf) {
  if (!adf || !adf.content) return '';
  
  const extractFromNode = (node) => {
    if (!node) return '';
    
    if (node.type === 'text') {
      return node.text || '';
    }
    
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractFromNode).join('');
    }
    
    return '';
  };

  return adf.content.map(extractFromNode).join('\n').trim();
}

/**
 * Search Jira issues using JQL
 */
async function searchIssues(query, options = {}) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();
  const { projectKey, issueType, status, maxResults = 25 } = options;

  const jql = buildJql(query, { projectKey, issueType, status });

  const fieldsArray = [
    'summary',
    'description',
    'issuetype',
    'status',
    'priority',
    'assignee',
    'reporter',
    'project',
    'created',
    'updated',
  ];

  // Use POST to /rest/api/3/search/jql with JSON body
  const url = `${baseUrl}/rest/api/3/search/jql`;

  console.error(`[JIRA DEBUG] JQL: ${jql}`);
  console.error(`[JIRA DEBUG] URL: ${url}`);

  const requestBody = {
    jql,
    maxResults: Math.min(maxResults, 100),
    fields: fieldsArray,
  };

  console.error(`[JIRA DEBUG] Request body: ${JSON.stringify(requestBody)}`);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // Try fallback with simpler text search if the original JQL fails
    if (query && !isJqlQuery(query)) {
      console.error(`[JIRA DEBUG] Primary search failed, trying fallback text search`);
      return searchIssuesFallback(query, options);
    }
    handleApiError(response, 'issue search');
  }

  const data = await response.json();

  console.error(`[JIRA DEBUG] Found ${data.total || 0} results`);

  return {
    total: data.total || 0,
    results: (data.issues || []).map(issue => transformIssue(issue, baseUrl)),
    jql,
  };
}

/**
 * Fallback search using simpler JQL when primary search fails
 */
async function searchIssuesFallback(query, options = {}) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();
  const { projectKey, maxResults = 25 } = options;

  // Build a simpler JQL - just search in summary with project filter
  const escapedQuery = query.replace(/"/g, '\\"');
  let fallbackJql = `summary ~ "${escapedQuery}"`;
  
  if (projectKey) {
    fallbackJql = `project = "${projectKey}" AND ${fallbackJql}`;
  }
  
  fallbackJql += ' ORDER BY updated DESC';

  const fieldsArray = [
    'summary',
    'description',
    'issuetype',
    'status',
    'priority',
    'assignee',
    'reporter',
    'project',
    'created',
    'updated',
  ];

  const url = `${baseUrl}/rest/api/3/search/jql`;

  console.error(`[JIRA DEBUG] Fallback JQL: ${fallbackJql}`);
  console.error(`[JIRA DEBUG] Fallback URL: ${url}`);

  const requestBody = {
    jql: fallbackJql,
    maxResults: Math.min(maxResults, 100),
    fields: fieldsArray,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    handleApiError(response, 'issue search (fallback)');
  }

  const data = await response.json();

  console.error(`[JIRA DEBUG] Fallback found ${data.total || 0} results`);

  return {
    total: data.total || 0,
    results: (data.issues || []).map(issue => transformIssue(issue, baseUrl)),
    jql: fallbackJql,
  };
}

/**
 * Get a specific Jira issue by key
 */
async function getIssue(issueKey) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();

  // Validate issue key format
  if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(issueKey)) {
    throw new Error(`Invalid issue key format: ${issueKey}. Expected format like "PROJ-123".`);
  }

  const fields = [
    'summary',
    'description',
    'issuetype',
    'status',
    'priority',
    'assignee',
    'reporter',
    'project',
    'created',
    'updated',
  ].join(',');

  const url = `${baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response, `get issue ${issueKey}`);
  }

  const issue = await response.json();
  return transformIssue(issue, baseUrl);
}

/**
 * List all accessible Jira projects
 */
async function listProjects(options = {}) {
  const { baseUrl } = getConfig();
  const headers = createHeaders();
  const { maxResults = 50 } = options;

  const url = `${baseUrl}/rest/api/3/project?maxResults=${Math.min(maxResults, 100)}&expand=description`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response, 'list projects');
  }

  const projects = await response.json();

  return projects.map(project => ({
    title: project.name,
    description: project.description || 'No description available',
    url: `${baseUrl}/browse/${project.key}`,
    source: 'Jira',
    type: 'project',
    projectKey: project.key,
    lead: project.lead?.displayName || null,
    projectType: project.projectTypeKey || null,
    style: project.style || null,
  }));
}

/**
 * Get recent issues from a specific project
 */
async function getProjectIssues(projectKey, options = {}) {
  const { status, maxResults = 25 } = options;

  // Validate project key format
  if (!/^[A-Z][A-Z0-9]*$/i.test(projectKey)) {
    throw new Error(`Invalid project key format: ${projectKey}. Expected format like "PROJ".`);
  }

  return searchIssues('', { projectKey, status, maxResults });
}

// Create the MCP server
const server = new Server(
  {
    name: 'shine-jira',
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
        name: 'jira_search',
        description: 'Search for Jira issues using JQL or text search. Use this to find bugs, tasks, stories, epics, and other issues. If you provide plain text, it will be converted to a text search; if you provide JQL syntax, it will be used directly.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - either plain text (auto-converted to JQL) or JQL syntax (e.g., "project = PROJ AND status = Open")',
            },
            projectKey: {
              type: 'string',
              description: 'Filter by project key (e.g., "PROJ", "SHINE")',
            },
            issueType: {
              type: 'string',
              enum: ['Bug', 'Task', 'Story', 'Epic', 'Sub-task'],
              description: 'Filter by issue type',
            },
            status: {
              type: 'string',
              description: 'Filter by status (e.g., "Open", "In Progress", "Done")',
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
        name: 'jira_get_issue',
        description: 'Get detailed information about a specific Jira issue by its key. Use this when you have an issue key like "PROJ-123" and need its full details.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'The Jira issue key (e.g., "PROJ-123", "SHINE-42")',
            },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_list_projects',
        description: 'List all Jira projects accessible to the user. Use this to discover available projects and their keys.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 50, max: 100)',
              default: 50,
            },
          },
        },
      },
      {
        name: 'jira_get_project_issues',
        description: 'Get recent issues from a specific Jira project. Use this to see the latest activity in a project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'The project key (e.g., "PROJ", "SHINE")',
            },
            status: {
              type: 'string',
              description: 'Filter by status (e.g., "Open", "In Progress", "Done")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 25, max: 100)',
              default: 25,
            },
          },
          required: ['projectKey'],
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
      case 'jira_search': {
        const result = await searchIssues(args.query, {
          projectKey: args.projectKey,
          issueType: args.issueType,
          status: args.status,
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

      case 'jira_get_issue': {
        const result = await getIssue(args.issueKey);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'jira_list_projects': {
        const results = await listProjects({
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

      case 'jira_get_project_issues': {
        const result = await getProjectIssues(args.projectKey, {
          status: args.status,
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
 * Check if Jira credentials are configured
 */
async function checkJiraAvailable() {
  const email = process.env.VITE_JIRA_EMAIL;
  const apiToken = process.env.VITE_JIRA_API_TOKEN;

  if (!email || !apiToken) {
    return false;
  }

  // Optionally validate credentials with a simple API call
  try {
    const { baseUrl } = getConfig();
    const headers = createHeaders();
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, { headers });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Search Jira - wrapper for orchestrator compatibility
 * Returns flat array of results (extracts from searchIssues response)
 */
async function searchJira(query, options = {}) {
  const response = await searchIssues(query, options);
  return response.results || [];
}

// Start the server (only when run directly)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SHINE Jira MCP Server running');
}

// Only start the server if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

// Export functions for orchestrator
export {
  searchJira,
  searchIssues,
  getIssue,
  listProjects,
  getProjectIssues,
  checkJiraAvailable,
};
