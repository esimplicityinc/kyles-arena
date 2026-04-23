/**
 * SHINE POC - Backend Proxy Server
 * Handles Microsoft Graph API authentication (CORS workaround)
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { unifiedSearch, getSourceStatus, isLLMAvailable } from '../mcp-server/orchestrator.js';

// Load environment variables from .env file
config();

const app = express();
const PORT = 3001;

// Enable CORS for our frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Cache token in memory
let cachedToken = null;
let tokenExpiry = null;

// Get access token from Microsoft
async function getAccessToken() {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.VITE_MS_CLIENT_ID;
  const clientSecret = process.env.VITE_MS_CLIENT_SECRET;
  const tenantId = process.env.VITE_MS_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('SharePoint credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Token error:', errorData);
    throw new Error(errorData.error_description || 'Failed to get access token');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  
  console.log('Got new Microsoft Graph access token');
  return cachedToken;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SHINE Proxy' });
});

// SharePoint search endpoint
app.post('/api/sharepoint/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`Searching SharePoint for: "${query}"`);
    
    const accessToken = await getAccessToken();
    
    const response = await fetch('https://graph.microsoft.com/v1.0/search/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            entityTypes: ['driveItem', 'listItem', 'site'],
            query: {
              queryString: query,
            },
            region: 'US',
            from: 0,
            size: 25,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Graph API error:', error);
      
      if (response.status === 401) {
        // Clear cached token
        cachedToken = null;
        tokenExpiry = null;
        return res.status(401).json({ error: 'Authentication failed. Check credentials.' });
      }
      
      return res.status(response.status).json({ 
        error: error.error?.message || 'SharePoint search failed' 
      });
    }

    const data = await response.json();
    
    // Format results
    const hits = data.value?.[0]?.hitsContainers?.[0]?.hits || [];
    const results = hits.map(hit => {
      const resource = hit.resource;
      return {
        type: getResultType(resource),
        title: resource.name || resource.displayName || 'Untitled',
        description: hit.summary || resource.description || '',
        url: resource.webUrl || '',
        source: 'SharePoint',
        lastModified: resource.lastModifiedDateTime,
        author: resource.lastModifiedBy?.user?.displayName || 
                resource.createdBy?.user?.displayName || 'Unknown',
        fileType: getFileType(resource.name),
        siteName: 'SHINE',
      };
    });

    console.log(`Found ${results.length} SharePoint results`);
    res.json(results);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

function getResultType(resource) {
  if (resource['@odata.type']?.includes('site')) return 'site';
  if (resource['@odata.type']?.includes('listItem')) return 'list';
  if (resource.file) return 'file';
  if (resource.folder) return 'folder';
  return 'document';
}

function getFileType(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || null;
}

// MCP-style tool endpoint
app.post('/api/mcp/tool', async (req, res) => {
  try {
    const { tool, args } = req.body;
    
    switch (tool) {
      case 'sharepoint_search': {
        const results = await searchSharePointInternal(args.query, args.maxResults);
        res.json({ success: true, results });
        break;
      }
      
      case 'sharepoint_list_sites': {
        const sites = await listSitesInternal();
        res.json({ success: true, results: sites });
        break;
      }
      
      default:
        res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Internal function to search SharePoint (reuse existing logic)
async function searchSharePointInternal(query, maxResults = 25) {
  const accessToken = await getAccessToken();
  
  const response = await fetch('https://graph.microsoft.com/v1.0/search/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        entityTypes: ['driveItem', 'listItem', 'site'],
        query: { queryString: query },
        region: 'US',
        from: 0,
        size: maxResults,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error('SharePoint search failed');
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
      fileType: getFileType(resource.name),
      source: 'SharePoint',
    };
  });
}

async function listSitesInternal() {
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
  }));
}

// Orchestrator endpoints

// Unified search across all sources
app.post('/api/orchestrator/search', async (req, res) => {
  try {
    const { query, sources, maxResults, generateSummary, conversationHistory } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`Orchestrator search: "${query}"`);

    const options = {};
    if (sources) options.sources = sources;
    if (maxResults) options.maxResults = maxResults;
    if (generateSummary !== undefined) options.generateSummary = generateSummary;
    if (conversationHistory) options.conversationHistory = conversationHistory;

    const results = await unifiedSearch(query, options);

    res.json(results);
  } catch (error) {
    console.error('Orchestrator search error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

// Get status of all connected sources
app.get('/api/orchestrator/status', async (req, res) => {
  try {
    const status = await getSourceStatus();
    res.json(status);
  } catch (error) {
    console.error('Orchestrator status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   SHINE Proxy Server running on port ${PORT}     ║
║   Health: http://localhost:${PORT}/api/health    ║
╚═══════════════════════════════════════════════╝
  `);
  
  // Check if credentials are configured
  if (!process.env.VITE_MS_CLIENT_ID) {
    console.warn('Warning: VITE_MS_CLIENT_ID not set');
  }
  if (!process.env.VITE_MS_TENANT_ID) {
    console.warn('Warning: VITE_MS_TENANT_ID not set');
  }
  if (!process.env.VITE_MS_CLIENT_SECRET) {
    console.warn('Warning: VITE_MS_CLIENT_SECRET not set');
  }

  // Log Claude LLM status
  if (isLLMAvailable()) {
    console.log('Claude LLM: enabled (conversational responses available)');
  } else {
    console.warn('Warning: ANTHROPIC_API_KEY not set - Claude integration disabled');
  }
});
