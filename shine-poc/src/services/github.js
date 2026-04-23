/**
 * GitHub Search Service
 * Searches code and repositories within the configured GitHub organization
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get configured GitHub token and organization
 */
function getConfig() {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const org = import.meta.env.VITE_GITHUB_ORG || 'esimplicityinc';
  
  if (!token) {
    console.warn('GitHub token not configured. Set VITE_GITHUB_TOKEN in .env file.');
  }
  
  return { token, org };
}

/**
 * Create headers for GitHub API requests
 */
function createHeaders(token) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Search GitHub code within the organization
 */
async function searchCode(query, org, headers) {
  const encodedQuery = encodeURIComponent(`${query} org:${org}`);
  const url = `${GITHUB_API_BASE}/search/code?q=${encodedQuery}&per_page=10`;
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('GitHub authentication failed. Check your token.');
    }
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Try again later.');
    }
    throw new Error(`GitHub code search failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Search GitHub repositories within the organization
 */
async function searchRepositories(query, org, headers) {
  const encodedQuery = encodeURIComponent(`${query} org:${org}`);
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodedQuery}&per_page=10`;
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('GitHub authentication failed. Check your token.');
    }
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Try again later.');
    }
    throw new Error(`GitHub repository search failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Check if a repository has GitHub Pages enabled
 */
function getGitHubPagesUrl(repo, org) {
  // Common patterns for GitHub Pages sites
  if (repo.has_pages || repo.homepage) {
    return repo.homepage || `https://${org}.github.io/${repo.name}/`;
  }
  return null;
}

/**
 * Format code search result
 */
function formatCodeResult(item, org) {
  const repo = item.repository;
  const isHtmlOrMd = /\.(html|htm|md|markdown)$/i.test(item.path);
  const pagesUrl = getGitHubPagesUrl(repo, org);
  
  // Determine if this might be a GitHub Pages file
  let webUrl = null;
  if (pagesUrl && isHtmlOrMd) {
    // Convert file path to potential Pages URL
    const pathWithoutExt = item.path.replace(/\.(md|markdown)$/i, '').replace(/index\.html?$/i, '');
    webUrl = `${pagesUrl}${pathWithoutExt}`;
  }
  
  return {
    type: 'code',
    title: item.name,
    description: `Found in ${item.path}`,
    url: item.html_url,
    webUrl,
    repo: repo.name,
    repoUrl: repo.html_url,
    path: item.path,
    source: 'GitHub',
    score: item.score,
  };
}

/**
 * Format repository search result
 */
function formatRepoResult(item, org) {
  const pagesUrl = getGitHubPagesUrl(item, org);
  
  return {
    type: 'repo',
    title: item.name,
    description: item.description || 'No description available',
    url: item.html_url,
    webUrl: pagesUrl,
    repo: item.name,
    repoUrl: item.html_url,
    path: null,
    source: 'GitHub',
    score: item.score,
    stars: item.stargazers_count,
    language: item.language,
    updatedAt: item.updated_at,
    hasPages: item.has_pages,
  };
}

/**
 * Main search function - searches both code and repositories
 * @param {string} query - The search query
 * @returns {Promise<{results: Array, error: string|null}>}
 */
export async function searchGitHub(query) {
  if (!query || !query.trim()) {
    return { results: [], error: null };
  }
  
  const { token, org } = getConfig();
  const headers = createHeaders(token);
  
  try {
    // Search both code and repos in parallel
    const [codeResponse, repoResponse] = await Promise.allSettled([
      searchCode(query, org, headers),
      searchRepositories(query, org, headers),
    ]);
    
    const results = [];
    
    // Process repository results first (usually more relevant)
    if (repoResponse.status === 'fulfilled' && repoResponse.value.items) {
      const repoResults = repoResponse.value.items.map(item => formatRepoResult(item, org));
      results.push(...repoResults);
    }
    
    // Process code results
    if (codeResponse.status === 'fulfilled' && codeResponse.value.items) {
      const codeResults = codeResponse.value.items.map(item => formatCodeResult(item, org));
      results.push(...codeResults);
    }
    
    // Check for errors
    const errors = [];
    if (codeResponse.status === 'rejected') {
      errors.push(codeResponse.reason.message);
    }
    if (repoResponse.status === 'rejected') {
      errors.push(repoResponse.reason.message);
    }
    
    return {
      results,
      error: errors.length > 0 ? errors.join('; ') : null,
      totalCount: results.length,
    };
  } catch (error) {
    console.error('GitHub search error:', error);
    return {
      results: [],
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Search specifically for GitHub Pages content
 * @param {string} query - The search query
 * @returns {Promise<{results: Array, error: string|null}>}
 */
export async function searchGitHubPages(query) {
  const { token, org } = getConfig();
  const headers = createHeaders(token);
  
  try {
    // Search for HTML, MD files that are likely Pages content
    const pagesQuery = `${query} org:${org} extension:html extension:md path:/ OR path:docs`;
    const encodedQuery = encodeURIComponent(pagesQuery);
    const url = `${GITHUB_API_BASE}/search/code?q=${encodedQuery}&per_page=15`;
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub Pages search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const results = data.items?.map(item => ({
      ...formatCodeResult(item, org),
      type: 'page',
    })) || [];
    
    return { results, error: null };
  } catch (error) {
    console.error('GitHub Pages search error:', error);
    return { results: [], error: error.message };
  }
}

export default {
  searchGitHub,
  searchGitHubPages,
};
