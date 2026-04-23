/**
 * SharePoint Search Service
 * Uses local proxy server to call Microsoft Graph API (avoids CORS)
 */

const PROXY_BASE = 'http://localhost:3001/api';

// Search SharePoint via proxy
export async function searchSharePoint(query) {
  try {
    const response = await fetch(`${PROXY_BASE}/sharepoint/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        throw new Error('SharePoint authentication failed. Check your credentials.');
      }
      
      throw new Error(error.error || 'SharePoint search failed');
    }

    const results = await response.json();
    return results;
    
  } catch (error) {
    // Check if proxy server is running
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('SharePoint proxy server not running. Start it with: npm run server');
    }
    throw error;
  }
}

// Check if SharePoint is configured (credentials are on server side now)
export function isSharePointConfigured() {
  // For now, assume it's configured if we have the env vars
  // The actual check happens on the server
  return !!(
    import.meta.env.VITE_MS_CLIENT_ID &&
    import.meta.env.VITE_MS_TENANT_ID
  );
}

// Check if proxy server is running
export async function checkProxyHealth() {
  try {
    const response = await fetch(`${PROXY_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
