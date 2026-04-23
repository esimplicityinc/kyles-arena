#!/usr/bin/env node

/**
 * SHINE MCP Server - GitHub Tools
 * Provides GitHub search and repository access via Model Context Protocol
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

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get GitHub configuration from environment
 */
function getConfig() {
  const token = process.env.VITE_GITHUB_TOKEN;
  const org = process.env.VITE_GITHUB_ORG || 'esimplicityinc';

  if (!token) {
    throw new Error('GitHub token not configured. Set VITE_GITHUB_TOKEN in .env file.');
  }

  return { token, org };
}

/**
 * Create headers for GitHub API requests
 */
function createHeaders(token) {
  return {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'SHINE-MCP-Server/1.0.0',
  };
}

/**
 * Handle GitHub API errors with helpful messages
 */
function handleApiError(response, operation) {
  if (response.status === 401) {
    throw new Error('GitHub authentication failed. Check your VITE_GITHUB_TOKEN.');
  }
  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining === '0') {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toISOString() : 'unknown';
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}.`);
    }
    throw new Error('GitHub API access forbidden. Check token permissions.');
  }
  if (response.status === 404) {
    throw new Error(`Resource not found: ${operation}`);
  }
  if (response.status === 422) {
    throw new Error('Invalid search query. Check your search syntax.');
  }
  throw new Error(`GitHub ${operation} failed: ${response.status} ${response.statusText}`);
}

/**
 * Check if a repository has GitHub Pages enabled
 */
function getGitHubPagesUrl(repo, org) {
  if (repo.has_pages || repo.homepage) {
    return repo.homepage || `https://${org}.github.io/${repo.name}/`;
  }
  return null;
}

/**
 * Create search query variations to handle natural language queries.
 * Converts between spaces and hyphens since users may search "flow optimized engineering"
 * but the repo is named "flow-optimized-engineering".
 */
function createSearchVariations(query) {
  const variations = [query];

  // If query has spaces, also try with hyphens
  if (query.includes(' ')) {
    variations.push(query.replace(/\s+/g, '-'));
  }

  // If query has hyphens, also try with spaces
  if (query.includes('-')) {
    variations.push(query.replace(/-/g, ' '));
  }

  return [...new Set(variations)];
}

/**
 * Calculate a boosted score for repository results.
 * Exact name matches get significantly boosted.
 */
function calculateBoostedScore(item, queryVariations) {
  const repoName = item.name.toLowerCase();
  let score = item.score || 0;

  for (const variation of queryVariations) {
    const normalizedVariation = variation.toLowerCase().replace(/\s+/g, '-');

    // Exact match gets highest boost
    if (repoName === normalizedVariation) {
      score += 1000;
      break;
    }

    // Name contains the full query variation
    if (repoName.includes(normalizedVariation)) {
      score += 500;
    }

    // Name starts with the query variation
    if (repoName.startsWith(normalizedVariation)) {
      score += 250;
    }
  }

  return score;
}

/**
 * Search GitHub code within the organization.
 * Tries multiple query variations to handle natural language queries.
 */
async function searchCode(query, options = {}) {
  const { token, org } = getConfig();
  const headers = createHeaders(token);
  const { fileExtension, path, maxResults = 25 } = options;

  const queryVariations = createSearchVariations(query);
  const allResults = [];
  const seenUrls = new Set();

  // Search with each query variation
  for (const variation of queryVariations) {
    // Build the search query with qualifiers
    let searchQuery = `${variation} org:${org}`;
    if (fileExtension) {
      searchQuery += ` extension:${fileExtension}`;
    }
    if (path) {
      searchQuery += ` path:${path}`;
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `${GITHUB_API_BASE}/search/code?q=${encodedQuery}&per_page=${Math.min(maxResults, 100)}`;

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        // Continue to next variation if this one fails
        if (response.status === 422) continue;
        handleApiError(response, 'code search');
      }

      const data = await response.json();

      for (const item of (data.items || [])) {
        // Deduplicate by URL
        if (seenUrls.has(item.html_url)) continue;
        seenUrls.add(item.html_url);

        const repo = item.repository;
        const pagesUrl = getGitHubPagesUrl(repo, org);
        const isHtmlOrMd = /\.(html|htm|md|markdown)$/i.test(item.path);

        let webUrl = null;
        if (pagesUrl && isHtmlOrMd) {
          const pathWithoutExt = item.path.replace(/\.(md|markdown)$/i, '').replace(/index\.html?$/i, '');
          webUrl = `${pagesUrl}${pathWithoutExt}`;
        }

        allResults.push({
          title: item.name,
          description: `Found in ${item.path}`,
          url: item.html_url,
          webUrl,
          repo: repo.name,
          repoUrl: repo.html_url,
          path: item.path,
          source: 'GitHub',
          type: 'code',
          score: item.score,
        });
      }
    } catch (error) {
      // Log but continue with other variations
      console.error(`Code search error for variation "${variation}":`, error.message);
    }
  }

  // Sort by score and limit results
  return allResults
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxResults);
}

/**
 * Search GitHub repositories within the organization.
 * Tries multiple query variations to handle natural language queries
 * (e.g., "flow optimized engineering" will also search "flow-optimized-engineering").
 * Boosts exact name matches to prioritize relevant results.
 */
async function searchRepositories(query, options = {}) {
  const { token, org } = getConfig();
  const headers = createHeaders(token);
  const { maxResults = 25 } = options;

  const queryVariations = createSearchVariations(query);
  const allResults = [];
  const seenRepos = new Set();

  // Search with each query variation
  for (const variation of queryVariations) {
    // Add in:name,description qualifier to prioritize repo name/description matches
    const searchQuery = `${variation} org:${org} in:name,description`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodedQuery}&per_page=${Math.min(maxResults, 100)}`;

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        // Continue to next variation if this one fails
        if (response.status === 422) continue;
        handleApiError(response, 'repository search');
      }

      const data = await response.json();

      for (const item of (data.items || [])) {
        // Deduplicate by repo name
        if (seenRepos.has(item.name)) continue;
        seenRepos.add(item.name);

        const pagesUrl = getGitHubPagesUrl(item, org);
        const boostedScore = calculateBoostedScore(item, queryVariations);

        allResults.push({
          title: item.name,
          description: item.description || 'No description available',
          url: item.html_url,
          webUrl: pagesUrl,
          repo: item.name,
          repoUrl: item.html_url,
          source: 'GitHub',
          type: 'repository',
          stars: item.stargazers_count,
          language: item.language,
          lastModified: item.updated_at,
          hasPages: item.has_pages,
          score: boostedScore,
        });
      }
    } catch (error) {
      // Log but continue with other variations
      console.error(`Repository search error for variation "${variation}":`, error.message);
    }
  }

  // Sort by boosted score (highest first) and limit results
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Combined search for code and repositories
 */
async function searchGitHub(query, options = {}) {
  const { searchType = 'all', maxResults = 10 } = options;

  const results = [];

  if (searchType === 'all' || searchType === 'repositories') {
    try {
      const repoResults = await searchRepositories(query, { maxResults });
      results.push(...repoResults);
    } catch (error) {
      // Log but don't fail if one search type fails
      console.error('Repository search error:', error.message);
    }
  }

  if (searchType === 'all' || searchType === 'code') {
    try {
      const codeResults = await searchCode(query, { maxResults });
      results.push(...codeResults);
    } catch (error) {
      console.error('Code search error:', error.message);
    }
  }

  return results;
}

/**
 * List repositories in the organization
 */
async function listRepos(options = {}) {
  const { token, org } = getConfig();
  const headers = createHeaders(token);
  const { sortBy = 'updated', maxResults = 25 } = options;

  // Map sortBy to GitHub API parameters
  const sortMap = {
    'updated': { sort: 'updated', direction: 'desc' },
    'stars': { sort: 'stars', direction: 'desc' },
    'name': { sort: 'full_name', direction: 'asc' },
  };
  const sortParams = sortMap[sortBy] || sortMap['updated'];

  const url = `${GITHUB_API_BASE}/orgs/${org}/repos?sort=${sortParams.sort}&direction=${sortParams.direction}&per_page=${Math.min(maxResults, 100)}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response, 'list repositories');
  }

  const data = await response.json();

  return data.map(item => {
    const pagesUrl = getGitHubPagesUrl(item, org);

    return {
      title: item.name,
      description: item.description || 'No description available',
      url: item.html_url,
      webUrl: pagesUrl,
      source: 'GitHub',
      type: 'repository',
      stars: item.stargazers_count,
      language: item.language,
      lastModified: item.updated_at,
      hasPages: item.has_pages,
      visibility: item.visibility,
      defaultBranch: item.default_branch,
    };
  });
}

/**
 * Get file content from a repository
 */
async function getFileContent(repoName, filePath, branch = 'main') {
  const { token, org } = getConfig();
  const headers = createHeaders(token);

  const url = `${GITHUB_API_BASE}/repos/${org}/${repoName}/contents/${filePath}?ref=${branch}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response, `get file ${filePath}`);
  }

  const data = await response.json();

  // GitHub returns content base64 encoded
  let content = null;
  let contentType = 'binary';

  if (data.encoding === 'base64' && data.content) {
    try {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
      contentType = 'text';
    } catch {
      content = data.content;
      contentType = 'base64';
    }
  }

  return {
    title: data.name,
    description: `File from ${repoName}/${filePath}`,
    url: data.html_url,
    downloadUrl: data.download_url,
    repo: repoName,
    path: data.path,
    source: 'GitHub',
    type: 'file',
    size: data.size,
    sha: data.sha,
    content,
    contentType,
  };
}

// Create the MCP server
const server = new Server(
  {
    name: 'shine-github',
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
        name: 'github_search',
        description: 'Search for code and repositories across the GitHub organization. Use this to find code examples, projects, documentation, and other content in the org\'s repositories.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query - keywords, function names, class names, or phrases to search for',
            },
            searchType: {
              type: 'string',
              enum: ['all', 'code', 'repositories'],
              description: 'What to search: "all" (default) searches both code and repos, "code" searches only code files, "repositories" searches only repo names and descriptions',
              default: 'all',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results per type (default: 10, max: 100)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'github_search_code',
        description: 'Search specifically for code files in the GitHub organization. Supports filtering by file extension and path. Best for finding specific implementations, functions, or code patterns.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query - code snippets, function names, variable names, or keywords',
            },
            fileExtension: {
              type: 'string',
              description: 'Filter by file extension (without the dot), e.g., "js", "py", "md", "tsx"',
            },
            path: {
              type: 'string',
              description: 'Filter by path prefix, e.g., "src/", "docs/", "lib/components"',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results (default: 25, max: 100)',
              default: 25,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'github_list_repos',
        description: 'List all repositories in the GitHub organization. Use this to discover available projects and codebases.',
        inputSchema: {
          type: 'object',
          properties: {
            sortBy: {
              type: 'string',
              enum: ['updated', 'stars', 'name'],
              description: 'How to sort results: "updated" (most recently updated first), "stars" (most starred first), or "name" (alphabetical)',
              default: 'updated',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results (default: 25, max: 100)',
              default: 25,
            },
          },
        },
      },
      {
        name: 'github_get_file_content',
        description: 'Get the content of a specific file from a repository. Use this after finding a file via search to read its full contents.',
        inputSchema: {
          type: 'object',
          properties: {
            repoName: {
              type: 'string',
              description: 'The repository name (not the full URL, just the repo name like "my-project")',
            },
            filePath: {
              type: 'string',
              description: 'Path to the file within the repository, e.g., "src/index.js" or "README.md"',
            },
            branch: {
              type: 'string',
              description: 'Branch to read from (default: "main")',
              default: 'main',
            },
          },
          required: ['repoName', 'filePath'],
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
      case 'github_search': {
        const results = await searchGitHub(args.query, {
          searchType: args.searchType || 'all',
          maxResults: args.maxResults || 10,
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

      case 'github_search_code': {
        const results = await searchCode(args.query, {
          fileExtension: args.fileExtension,
          path: args.path,
          maxResults: args.maxResults || 25,
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

      case 'github_list_repos': {
        const results = await listRepos({
          sortBy: args.sortBy || 'updated',
          maxResults: args.maxResults || 25,
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

      case 'github_get_file_content': {
        const result = await getFileContent(
          args.repoName,
          args.filePath,
          args.branch || 'main'
        );

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
 * Check if GitHub credentials are configured
 */
async function checkGitHubAvailable() {
  const token = process.env.VITE_GITHUB_TOKEN;

  if (!token) {
    return false;
  }

  // Optionally validate token with a simple API call
  try {
    const headers = createHeaders(token);
    const response = await fetch(`${GITHUB_API_BASE}/user`, { headers });
    return response.ok;
  } catch {
    return false;
  }
}

// Start the server (only when run directly)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SHINE GitHub MCP Server running');
}

// Only start the server if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

// Export functions for orchestrator
export {
  searchGitHub,
  searchCode,
  searchRepositories,
  listRepos,
  getFileContent,
  checkGitHubAvailable,
  createSearchVariations,
  calculateBoostedScore,
};
