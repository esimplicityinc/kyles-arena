#!/usr/bin/env node

/**
 * SHINE MCP Server - SharePoint Tools
 * Provides SharePoint search capabilities via Model Context Protocol
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

// Token cache
let cachedToken = null;
let tokenExpiry = null;

// Get Microsoft Graph access token
async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.VITE_MS_CLIENT_ID;
  const clientSecret = process.env.VITE_MS_CLIENT_SECRET;
  const tenantId = process.env.VITE_MS_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('SharePoint credentials not configured in .env');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to authenticate with Microsoft');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  
  return cachedToken;
}

// Search SharePoint
async function searchSharePoint(query, options = {}) {
  const accessToken = await getAccessToken();
  const { entityTypes = ['driveItem', 'listItem', 'site'], size = 25 } = options;
  
  const response = await fetch('https://graph.microsoft.com/v1.0/search/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        entityTypes,
        query: { queryString: query },
        region: 'US',
        from: 0,
        size,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'SharePoint search failed');
  }

  const data = await response.json();
  const hits = data.value?.[0]?.hitsContainers?.[0]?.hits || [];
  
  return hits.map(hit => {
    const resource = hit.resource;
    return {
      title: resource.name || resource.displayName || 'Untitled',
      description: hit.summary || resource.description || '',
      url: resource.webUrl || '',
      type: getResultType(resource),
      lastModified: resource.lastModifiedDateTime,
      author: resource.lastModifiedBy?.user?.displayName || 
              resource.createdBy?.user?.displayName || 'Unknown',
      fileType: resource.name?.split('.').pop()?.toLowerCase() || null,
      source: 'SharePoint',
    };
  });
}

function getResultType(resource) {
  if (resource['@odata.type']?.includes('site')) return 'site';
  if (resource['@odata.type']?.includes('listItem')) return 'list';
  if (resource.file) return 'file';
  if (resource.folder) return 'folder';
  return 'document';
}

// Get file/document content
async function getFileContent(driveItemId, siteId) {
  const accessToken = await getAccessToken();
  
  // Get file metadata and content
  const url = siteId 
    ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${driveItemId}`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}`;
    
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get file information');
  }

  return response.json();
}

// List sites
async function listSites() {
  const accessToken = await getAccessToken();
  
  const response = await fetch('https://graph.microsoft.com/v1.0/sites?search=*', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to list sites');
  }

  const data = await response.json();
  return data.value.map(site => ({
    name: site.displayName,
    url: site.webUrl,
    id: site.id,
    description: site.description || '',
  }));
}

// Create the MCP server
const server = new Server(
  {
    name: 'shine-sharepoint',
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
        name: 'sharepoint_search',
        description: 'Search for documents, files, and content across SharePoint sites. Use this to find proposals, templates, policies, and other organizational knowledge.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query - can be keywords, phrases, or questions',
            },
            contentTypes: {
              type: 'array',
              items: { type: 'string', enum: ['files', 'sites', 'lists', 'all'] },
              description: 'Types of content to search (default: all)',
              default: ['all'],
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
              default: 25,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'sharepoint_list_sites',
        description: 'List all SharePoint sites accessible to the organization. Use this to discover what sites and content repositories exist.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'sharepoint_get_file_info',
        description: 'Get detailed information about a specific file or document in SharePoint.',
        inputSchema: {
          type: 'object',
          properties: {
            fileUrl: {
              type: 'string',
              description: 'The SharePoint URL of the file',
            },
          },
          required: ['fileUrl'],
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
      case 'sharepoint_search': {
        const entityTypes = args.contentTypes?.includes('all') || !args.contentTypes
          ? ['driveItem', 'listItem', 'site']
          : args.contentTypes.map(t => {
              if (t === 'files') return 'driveItem';
              if (t === 'sites') return 'site';
              if (t === 'lists') return 'listItem';
              return t;
            });
            
        const results = await searchSharePoint(args.query, {
          entityTypes,
          size: args.maxResults || 25,
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

      case 'sharepoint_list_sites': {
        const sites = await listSites();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sites, null, 2),
            },
          ],
        };
      }

      case 'sharepoint_get_file_info': {
        // Extract IDs from URL if possible, or return error
        return {
          content: [
            {
              type: 'text',
              text: 'File info retrieval requires additional URL parsing. Use sharepoint_search to find files first.',
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
 * Check if SharePoint credentials are configured
 */
async function checkSharePointAvailable() {
  const clientId = process.env.VITE_MS_CLIENT_ID;
  const clientSecret = process.env.VITE_MS_CLIENT_SECRET;
  const tenantId = process.env.VITE_MS_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    return false;
  }

  // Optionally validate token
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

// Start the server (only when run directly)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SHINE SharePoint MCP Server running');
}

// Only start the server if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

// Export functions for orchestrator
export {
  searchSharePoint,
  listSites,
  getFileContent,
  checkSharePointAvailable,
};
