/**
 * Orchestrator Service
 * Calls the SHINE orchestrator for unified multi-source search
 */

const ORCHESTRATOR_BASE = 'http://localhost:3001/api/orchestrator';

/**
 * Search across all sources using the orchestrator
 */
export async function orchestratorSearch(query, options = {}) {
  // Build sources array based on sourceFilter
  let sources = options.sources;
  if (options.sourceFilter) {
    // If a specific source filter is provided, only search that source
    sources = [options.sourceFilter];
  }

  const response = await fetch(`${ORCHESTRATOR_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      sources,
      maxResults: options.maxResults || 10,
      generateSummary: true,
      conversationHistory: options.conversationHistory || [],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Orchestrator search failed');
  }

  return response.json();
}

/**
 * Get status of all connected sources
 */
export async function getOrchestratorStatus() {
  const response = await fetch(`${ORCHESTRATOR_BASE}/status`);
  
  if (!response.ok) {
    throw new Error('Failed to get orchestrator status');
  }

  return response.json();
}

/**
 * Check if orchestrator is available
 */
export async function isOrchestratorAvailable() {
  try {
    const response = await fetch(`${ORCHESTRATOR_BASE}/status`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  orchestratorSearch,
  getOrchestratorStatus,
  isOrchestratorAvailable,
};
