// Analytics service for SHINE POC
// Tracks events and stores in localStorage

const STORAGE_KEY = 'shine_analytics';
const SESSION_KEY = 'shine_session';
const HISTORY_KEY = 'shine_search_history';
const USER_KEY = 'shine_user_id';

// Generate a simple unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Get or create persistent user ID
function getUserId() {
  let userId = localStorage.getItem(USER_KEY);
  if (!userId) {
    userId = 'user_' + generateId();
    localStorage.setItem(USER_KEY, userId);
  }
  return userId;
}

// Get or create session ID (new each browser session)
function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'session_' + generateId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Track an event
export function trackEvent(eventType, data = {}) {
  const event = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    sessionId: getSessionId(),
    type: eventType,
    ...data
  };
  
  const events = getEvents();
  events.push(event);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  
  return event;
}

// Get all events
export function getEvents() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Filter events by time range
function filterEventsByTimeRange(events, timeRange) {
  if (!timeRange || timeRange === 'all') {
    return events;
  }
  
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return events;
  }
  
  return events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startDate;
  });
}

// Get aggregated metrics
export function getMetrics(timeRange = 'all') {
  const allEvents = getEvents();
  const events = filterEventsByTimeRange(allEvents, timeRange);
  
  // Filter by event type
  const searches = events.filter(e => e.type === 'search');
  const clicks = events.filter(e => e.type === 'result_click');
  const sessions = events.filter(e => e.type === 'session_start');
  
  // Unique counts
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
  const uniqueUsers = new Set(events.map(e => e.userId)).size;
  
  // Top queries by frequency
  const queryCount = {};
  searches.forEach(e => {
    const q = (e.query || '').toLowerCase().trim();
    if (q) {
      queryCount[q] = (queryCount[q] || 0) + 1;
    }
  });
  const topQueries = Object.entries(queryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
  
  // Zero result queries
  const zeroResultQueries = {};
  searches.filter(e => e.resultCount === 0).forEach(e => {
    const q = (e.query || '').toLowerCase().trim();
    if (q) {
      zeroResultQueries[q] = (zeroResultQueries[q] || 0) + 1;
    }
  });
  const zeroResultList = Object.entries(zeroResultQueries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
  
  // Queries by source
  const sourceCount = {};
  searches.forEach(e => {
    const src = e.source || 'unknown';
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  });
  
  // Average query length
  const avgQueryLength = searches.length > 0
    ? searches.reduce((sum, e) => sum + (e.query || '').length, 0) / searches.length
    : 0;
  
  // Click through rate
  const searchesWithClicks = new Set(clicks.map(c => c.searchId)).size;
  const clickThroughRate = searches.length > 0
    ? (searchesWithClicks / searches.length) * 100
    : 0;
  
  // Average results per search
  const avgResultsPerSearch = searches.length > 0
    ? searches.reduce((sum, e) => sum + (e.resultCount || 0), 0) / searches.length
    : 0;
  
  // Searches without clicks
  const searchIds = new Set(searches.map(s => s.id));
  const clickedSearchIds = new Set(clicks.map(c => c.searchId));
  const searchesWithoutClicks = [...searchIds].filter(id => !clickedSearchIds.has(id)).length;
  
  // Top clicked results
  const clickCount = {};
  clicks.forEach(e => {
    const url = e.url || '';
    if (url) {
      if (!clickCount[url]) {
        clickCount[url] = { url, title: e.title || url, count: 0 };
      }
      clickCount[url].count++;
    }
  });
  const topClickedResults = Object.values(clickCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Source popularity (from clicks)
  const clickSourceCount = {};
  clicks.forEach(e => {
    const src = e.resultSource || 'unknown';
    clickSourceCount[src] = (clickSourceCount[src] || 0) + 1;
  });
  const totalClicks = clicks.length;
  const sourcePopularity = Object.entries(clickSourceCount)
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    // Adoption
    totalSessions: sessions.length,
    totalSearches: searches.length,
    uniqueUsers,
    uniqueSessions,
    searchesPerSession: uniqueSessions > 0 
      ? Math.round((searches.length / uniqueSessions) * 10) / 10 
      : 0,
    
    // Search behavior
    topQueries,
    queriesBySource: sourceCount,
    zeroResultQueries: zeroResultList,
    avgQueryLength: Math.round(avgQueryLength * 10) / 10,
    
    // Quality
    totalClicks,
    clickThroughRate: Math.round(clickThroughRate),
    avgResultsPerSearch: Math.round(avgResultsPerSearch * 10) / 10,
    searchesWithoutClicks,
    
    // Value
    topClickedResults,
    sourcePopularity
  };
}

// Search history (separate, user-facing)
export function addToHistory(query, resultCount) {
  const history = getHistory();
  const entry = {
    id: generateId(),
    query,
    resultCount,
    timestamp: new Date().toISOString()
  };
  
  // Remove duplicate queries (keep most recent)
  const filtered = history.filter(h => h.query.toLowerCase() !== query.toLowerCase());
  filtered.unshift(entry);
  
  // Keep only last 20
  const trimmed = filtered.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  
  return entry;
}

export function getHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// Export data as JSON
export function exportAnalytics() {
  const data = {
    exportedAt: new Date().toISOString(),
    events: getEvents(),
    metrics: getMetrics(),
    history: getHistory()
  };
  return JSON.stringify(data, null, 2);
}

// Clear all analytics (for testing)
export function clearAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(HISTORY_KEY);
  // Note: We don't clear user ID or session ID
}
