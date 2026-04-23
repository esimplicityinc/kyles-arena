import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { orchestratorSearch, getOrchestratorStatus } from './services/orchestrator'
import { trackEvent, addToHistory, getHistory } from './services/analytics'
import Layout from './components/Layout'
import './App.css'

// Constants
const STORAGE_KEYS = {
  SIDEBAR_OPEN: 'shine_sidebar_open',
  FAVORITES: 'shine_favorites',
}

const POPULAR_SEARCHES = [
  'SOW templates',
  'Security policies',
  'AWS migration',
  'Onboarding documents',
  'API documentation',
]

const QUICK_ACCESS_LINKS = [
  { name: 'SharePoint', icon: '📄', url: 'https://esimplicitycom.sharepoint.com', connected: true },
  { name: 'GitHub', icon: '💻', url: 'https://github.com/esimplicityinc', connected: true },
  { name: 'Jira', icon: '📋', url: 'https://esimplicity.atlassian.net', connected: true },
  { name: 'Confluence', icon: '📝', url: 'https://esimplicity.atlassian.net/wiki', connected: true },
]

const WELCOME_SUGGESTIONS = [
  'Can you find the latest SOW templates?',
  'Who worked on the AWS migration project?',
  'What are our security policies?',
  'Show me recent DevOps documentation',
]

const SOURCE_FILTERS = [
  { id: 'all', label: 'All Sources', icon: '🔍' },
  { id: 'sharepoint', label: 'SharePoint', icon: '📄' },
  { id: 'github', label: 'GitHub', icon: '💻' },
  { id: 'jira', label: 'Jira', icon: '📋' },
  { id: 'confluence', label: 'Confluence', icon: '📝' },
]

function App() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentSearchId, setCurrentSearchId] = useState(null)
  const [focusedHistoryIndex, setFocusedHistoryIndex] = useState(-1)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN)
    if (saved !== null) return JSON.parse(saved)
    return window.innerWidth >= 1024
  })
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES)
    return saved ? JSON.parse(saved) : []
  })
  const [expandedMessages, setExpandedMessages] = useState({})
  const [sourceStatus, setSourceStatus] = useState({
    sharepoint: { available: false },
    github: { available: false },
    jira: { available: false },
    confluence: { available: false },
  })
  const [sourceFilter, setSourceFilter] = useState('all') // 'all', 'sharepoint', 'github', 'jira', 'confluence'
  
  const messagesEndRef = useRef(null)
  const historyRef = useRef(null)
  const historyItemsRef = useRef([])

  const connectedSources = [
    { name: 'SharePoint', icon: '📄', connected: sourceStatus.sharepoint?.available },
    { name: 'GitHub', icon: '💻', connected: sourceStatus.github?.available },
    { name: 'Jira', icon: '📋', connected: sourceStatus.jira?.available },
    { name: 'Confluence', icon: '📝', connected: sourceStatus.confluence?.available },
  ]

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  // Persist favorites
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites))
  }, [favorites])

  // Track session start on mount
  useEffect(() => {
    trackEvent('session_start')
    setSearchHistory(getHistory())
  }, [])

  // Check orchestrator status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await getOrchestratorStatus()
        setSourceStatus(status)
      } catch (err) {
        console.error('Failed to get orchestrator status:', err)
      }
    }
    checkStatus()
  }, [])

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSearching])

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  const toggleFavorite = (result) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.url === result.url)
      if (exists) {
        return prev.filter(f => f.url !== result.url)
      }
      return [...prev, { ...result, favoritedAt: Date.now() }]
    })
  }

  const isFavorited = (result) => {
    return favorites.some(f => f.url === result.url)
  }

  const removeFavorite = (url) => {
    setFavorites(prev => prev.filter(f => f.url !== url))
  }

  const clearHistory = () => {
    localStorage.removeItem('shine_search_history')
    setSearchHistory([])
  }

  const toggleShowAllResults = (messageIndex) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim() || isSearching) return
    
    const userQuery = query.trim()
    setQuery('')
    setShowHistory(false)
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userQuery }])
    setIsSearching(true)
    
    // Generate a search ID for tracking clicks
    const searchId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
    setCurrentSearchId(searchId)
    
    try {
      // Build conversation history from previous messages
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.role === 'user' ? m.content : (m.summary || m.content)
      }))
      
      // Use orchestrator for unified search
      const response = await orchestratorSearch(userQuery, { 
        maxResults: 10,
        conversationHistory,
        sourceFilter: sourceFilter !== 'all' ? sourceFilter : undefined,
      })
      
      const allResults = response.results || []
      const sourceCounts = {}
      
      // Count results by source
      allResults.forEach(r => {
        sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1
      })
      
      // Build source summary
      const sourceList = Object.entries(sourceCounts)
        .map(([source, count]) => `${source} (${count})`)
        .join(', ')

      // Add to search history
      addToHistory(userQuery, allResults.length)
      setSearchHistory(getHistory())

      // Track results
      trackEvent('search', { 
        id: searchId,
        query: userQuery, 
        resultCount: allResults.length,
        sources: Object.keys(sourceCounts).join(','),
        searchDuration: response.searchDuration,
      })

      // Add assistant response with AI summary
      if (allResults.length > 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.summary || `Found ${allResults.length} result${allResults.length === 1 ? '' : 's'} across ${sourceList}`,
          summary: response.summary,
          results: allResults,
          followUpSuggestions: response.followUpSuggestions || [],
          searchId: searchId,
          sourceCounts,
          intent: response.intent,
          searchDuration: response.searchDuration,
          error: response.sourceStatus ? 
            Object.entries(response.sourceStatus)
              .filter(([_, s]) => s.error)
              .map(([name, s]) => `${name}: ${s.error}`)
              .join('; ') || null
            : null
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.summary || `No results found for "${userQuery}". Try different keywords or check if the sources are connected.`,
          summary: response.summary,
          results: [],
          followUpSuggestions: response.followUpSuggestions || [],
          searchId: searchId,
          intent: response.intent,
        }])
      }
    } catch (err) {
      // Track error event
      trackEvent('error', { 
        query: userQuery, 
        error: err.message || 'Search failed',
        source: 'orchestrator'
      })
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong with the search. Make sure the proxy server is running on port 3001.',
        error: err.message || 'Search failed'
      }])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    // Auto-submit for welcome suggestions
    setTimeout(() => {
      const form = document.querySelector('.chat-form')
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    }, 100)
  }

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query)
    setShowHistory(false)
    setFocusedHistoryIndex(-1)
  }

  const handleHistorySearch = (historyQuery) => {
    setQuery(historyQuery)
    setTimeout(() => {
      const form = document.querySelector('.chat-form')
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    }, 100)
  }

  // Keyboard navigation for history dropdown
  const handleHistoryKeyDown = useCallback((e) => {
    if (!showHistory || searchHistory.length === 0) return

    const maxIndex = Math.min(searchHistory.length - 1, 9) // Max 10 items

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setShowHistory(false)
        setFocusedHistoryIndex(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedHistoryIndex(prev => 
          prev < maxIndex ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedHistoryIndex(prev => 
          prev > 0 ? prev - 1 : maxIndex
        )
        break
      case 'Enter':
        if (focusedHistoryIndex >= 0 && focusedHistoryIndex <= maxIndex) {
          e.preventDefault()
          handleHistoryClick(searchHistory[focusedHistoryIndex])
        }
        break
      default:
        break
    }
  }, [showHistory, searchHistory, focusedHistoryIndex])

  // Focus the selected history item
  useEffect(() => {
    if (focusedHistoryIndex >= 0 && historyItemsRef.current[focusedHistoryIndex]) {
      historyItemsRef.current[focusedHistoryIndex].focus()
    }
  }, [focusedHistoryIndex])

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!showHistory) {
      setFocusedHistoryIndex(-1)
    }
  }, [showHistory])

  const handleResultClick = (result, position, searchId) => {
    trackEvent('result_click', {
      searchId,
      url: result.url,
      title: result.title,
      resultType: result.type,
      resultSource: result.source,
      position
    })
  }

  const getResultIcon = (result) => {
    // For SharePoint results, use file type icons
    if (result.source === 'SharePoint') {
      return <span className="result-type-icon file-icon">{getFileTypeIcon(result.fileType)}</span>
    }
    
    // For GitHub results, use SVG icons
    switch (result.type) {
      case 'repo':
        return (
          <svg className="result-type-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
          </svg>
        )
      case 'page':
        return (
          <svg className="result-type-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25H1.75z"/>
            <path d="M4 4.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5z"/>
          </svg>
        )
      case 'code':
      default:
        return (
          <svg className="result-type-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z"/>
          </svg>
        )
    }
  }

  const getResultTypeBadge = (result) => {
    if (result.source === 'SharePoint') {
      const labels = {
        site: 'Site',
        list: 'List',
        file: 'File',
        folder: 'Folder',
        document: 'Document',
      }
      return labels[result.type] || 'Document'
    }
    // GitHub labels
    const labels = {
      repo: 'Repository',
      page: 'Page',
      code: 'Code',
    }
    return labels[result.type] || 'File'
  }

  const getSourceBadgeColor = (source) => {
    const colors = {
      SharePoint: { bg: 'rgba(0, 120, 212, 0.1)', color: '#0078d4' },
      GitHub: { bg: 'rgba(36, 41, 46, 0.1)', color: '#24292e' },
      Jira: { bg: 'rgba(0, 82, 204, 0.1)', color: '#0052cc' },
    }
    return colors[source] || { bg: '#F3F0F5', color: '#8B7A9E' }
  }

  const showWelcome = messages.length === 0

  // Transform sourceStatus to Layout format
  const layoutSourceStatus = {
    sharepoint: sourceStatus.sharepoint?.available ? 'connected' : 'disconnected',
    github: sourceStatus.github?.available ? 'connected' : 'disconnected',
    jira: sourceStatus.jira?.available ? 'connected' : 'disconnected',
    confluence: sourceStatus.confluence?.available ? 'connected' : 'disconnected',
  }

  return (
    <Layout sourceStatus={layoutSourceStatus} currentPage="chat">
      <div className={`app ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <a href="#main-content" className="skip-link">Skip to main content</a>

        <div className="app-body">
          {/* Sidebar */}
          <aside 
          className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`}
          aria-label="Navigation sidebar"
        >
          {/* Sidebar toggle button */}
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Mobile overlay */}
          {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
          
          <nav className="sidebar-content" aria-label="Sidebar navigation">
            {/* Quick Access Section */}
            <section className="sidebar-section">
              <h2 className="sidebar-section-title">
                <span className="section-icon" aria-hidden="true">🔗</span>
                {sidebarOpen && <span>Quick Access</span>}
              </h2>
              <ul className="sidebar-list">
                {QUICK_ACCESS_LINKS.map((link) => (
                  <li key={link.name}>
                    {link.comingSoon ? (
                      <div className="sidebar-item disabled" title={`${link.name} - Coming Soon`}>
                        <span className="sidebar-item-icon" aria-hidden="true">{link.icon}</span>
                        {sidebarOpen && (
                          <>
                            <span className="sidebar-item-text">{link.name}</span>
                            <span className="coming-soon-badge">Soon</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="sidebar-item"
                        title={link.name}
                      >
                        <span className="sidebar-item-icon" aria-hidden="true">{link.icon}</span>
                        {sidebarOpen && <span className="sidebar-item-text">{link.name}</span>}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Favorites Section */}
            <section className="sidebar-section">
              <h2 className="sidebar-section-title">
                <span className="section-icon" aria-hidden="true">⭐</span>
                {sidebarOpen && <span>Saved Items</span>}
              </h2>
              {sidebarOpen && (
                <div className="sidebar-section-content">
                  {favorites.length === 0 ? (
                    <p className="sidebar-empty-state">Star results to save them here</p>
                  ) : (
                    <ul className="favorites-list">
                      {favorites.map((fav) => (
                        <li key={fav.url} className="favorite-item">
                          <a 
                            href={fav.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="favorite-link"
                            title={fav.title}
                          >
                            <span 
                              className="favorite-source-badge"
                              style={getSourceBadgeColor(fav.source)}
                            >
                              {fav.source?.charAt(0)}
                            </span>
                            <span className="favorite-title">{fav.title}</span>
                          </a>
                          <button
                            className="favorite-remove"
                            onClick={() => removeFavorite(fav.url)}
                            aria-label={`Remove ${fav.title} from favorites`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {/* Recent Searches Section */}
            <section className="sidebar-section">
              <h2 className="sidebar-section-title">
                <span className="section-icon" aria-hidden="true">🕐</span>
                {sidebarOpen && (
                  <>
                    <span>Recent Searches</span>
                    {searchHistory.length > 0 && (
                      <button 
                        className="clear-history-btn"
                        onClick={clearHistory}
                        aria-label="Clear search history"
                      >
                        Clear
                      </button>
                    )}
                  </>
                )}
              </h2>
              {sidebarOpen && (
                <div className="sidebar-section-content">
                  {searchHistory.length === 0 ? (
                    <p className="sidebar-empty-state">No recent searches</p>
                  ) : (
                    <ul className="recent-list">
                      {searchHistory.slice(0, 10).map((item) => (
                        <li key={item.id}>
                          <button
                            className="recent-item"
                            onClick={() => handleHistorySearch(item.query)}
                          >
                            <span className="recent-query">{item.query}</span>
                            <span className="recent-count">{item.resultCount}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {/* Popular Searches Section */}
            <section className="sidebar-section">
              <h2 className="sidebar-section-title">
                <span className="section-icon" aria-hidden="true">🔥</span>
                {sidebarOpen && <span>Popular Searches</span>}
              </h2>
              {sidebarOpen && (
                <ul className="popular-list">
                  {POPULAR_SEARCHES.map((search) => (
                    <li key={search}>
                      <button
                        className="popular-item"
                        onClick={() => handleHistorySearch(search)}
                      >
                        {search}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Collapse button at bottom */}
            <div className="sidebar-footer">
              <button 
                className="collapse-btn"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className={sidebarOpen ? 'rotate-180' : ''}
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {sidebarOpen && <span>Collapse</span>}
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main" id="main-content" role="main" aria-label="Search interface">
          <div className="chat-container">
            {/* Scrollable Messages Area */}
            <div className="messages-area">
              {showWelcome ? (
                /* Welcome Section */
                <div className="welcome-section">
                  <img src="/shine-logo.svg" alt="" className="welcome-logo" aria-hidden="true" />
                  <h1 className="welcome-title">Welcome to SHINE</h1>
                  <p className="welcome-description">
                    The gateway to our collective intelligence.
                  </p>
                  <p className="welcome-description-secondary">
                    Search across documents, code, tickets, and wikis — instantly find what your team has built.
                  </p>

                  {/* Try asking */}
                  <div className="welcome-suggestions">
                    <h2 className="welcome-suggestions-title">Try asking:</h2>
                    <div className="welcome-chips">
                      {WELCOME_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="welcome-chip"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <>
                  {messages.map((msg, index) => (
                    <div key={index} className={`message message-${msg.role}`}>
                      {msg.role === 'assistant' && (
                        <div className="message-avatar">
                          <img src="/shine-logo.svg" alt="" aria-hidden="true" className="avatar-img" />
                        </div>
                      )}
                      <div className={`message-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
                        <p className="message-text">{msg.content}</p>
                        
                        {/* Error inside message */}
                        {msg.error && (
                          <div className="message-error" role="alert" aria-live="assertive">
                            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{msg.error}</span>
                          </div>
                        )}
                        
                        {/* Results inside assistant message */}
                        {msg.results && msg.results.length > 0 && (
                          <div className="message-results">
                            {(expandedMessages[index] ? msg.results : msg.results.slice(0, 5)).map((result, resultIndex) => {
                              const resultTitleId = `result-title-${index}-${resultIndex}`
                              const isSharePoint = result.source === 'SharePoint'
                              const sourceColors = getSourceBadgeColor(result.source)
                              const favorited = isFavorited(result)
                              
                              return (
                                <div 
                                  key={resultIndex} 
                                  className={`result-card result-${result.type} result-source-${result.source?.toLowerCase()}`}
                                  role="article"
                                  aria-labelledby={resultTitleId}
                                >
                                  <div className="result-header">
                                    <div className="result-type">
                                      {getResultIcon(result)}
                                      <span className="result-type-label">{getResultTypeBadge(result)}</span>
                                    </div>
                                    <div className="result-header-right">
                                      <span 
                                        className="result-source"
                                        style={{ background: sourceColors.bg, color: sourceColors.color }}
                                      >
                                        {result.source}
                                      </span>
                                      <button
                                        className={`favorite-btn ${favorited ? 'favorited' : ''}`}
                                        onClick={() => toggleFavorite(result)}
                                        aria-label={favorited ? `Remove ${result.title} from favorites` : `Add ${result.title} to favorites`}
                                        aria-pressed={favorited}
                                      >
                                        {favorited ? (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                          </svg>
                                        ) : (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <h3 id={resultTitleId} className="result-title">{result.title}</h3>
                                  
                                  {result.description && (
                                    <p className="result-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.description) }} />
                                  )}
                                  
                                  {/* GitHub-specific meta */}
                                  {!isSharePoint && (
                                    <div className="result-meta">
                                      <span className="result-repo">
                                        <svg viewBox="0 0 16 16" fill="currentColor" className="repo-icon" aria-hidden="true" focusable="false">
                                          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/>
                                        </svg>
                                        {result.repo}
                                      </span>
                                      {result.path && (
                                        <span className="result-path" title={result.path}>
                                          {result.path.length > 30 ? `...${result.path.slice(-27)}` : result.path}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* SharePoint-specific meta */}
                                  {isSharePoint && (
                                    <div className="result-meta">
                                      {result.siteName && (
                                        <span className="result-site">
                                          <svg viewBox="0 0 16 16" fill="currentColor" className="site-icon" aria-hidden="true" focusable="false">
                                            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75z"/>
                                          </svg>
                                          {result.siteName}
                                        </span>
                                      )}
                                      {result.author && result.author !== 'Unknown' && (
                                        <span className="result-author">
                                          By {result.author}
                                        </span>
                                      )}
                                      {result.lastModified && (
                                        <span className="result-date">
                                          {new Date(result.lastModified).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="result-actions">
                                    <a 
                                      href={result.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="result-link"
                                      aria-label={`${isSharePoint ? 'Open in SharePoint' : 'View on GitHub'}: ${result.title} (opens in new tab)`}
                                      onClick={() => handleResultClick(result, resultIndex, msg.searchId)}
                                    >
                                      {isSharePoint ? 'Open in SharePoint' : 'View on GitHub'}
                                      <svg viewBox="0 0 16 16" fill="currentColor" className="external-icon" aria-hidden="true" focusable="false">
                                        <path d="M3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"/>
                                        <path d="M10 1a.75.75 0 000 1.5h2.44L7.22 7.72a.75.75 0 001.06 1.06l5.22-5.22V6a.75.75 0 001.5 0V1.75a.75.75 0 00-.75-.75H10z"/>
                                      </svg>
                                    </a>
                                    {result.webUrl && !isSharePoint && (
                                      <a 
                                        href={result.webUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="result-link result-link-pages"
                                        aria-label={`Open ${result.title} page (opens in new tab)`}
                                        onClick={() => handleResultClick({ ...result, url: result.webUrl }, resultIndex, msg.searchId)}
                                      >
                                        Open Page
                                        <svg viewBox="0 0 16 16" fill="currentColor" className="external-icon" aria-hidden="true" focusable="false">
                                          <path d="M3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"/>
                                          <path d="M10 1a.75.75 0 000 1.5h2.44L7.22 7.72a.75.75 0 001.06 1.06l5.22-5.22V6a.75.75 0 001.5 0V1.75a.75.75 0 00-.75-.75H10z"/>
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                  
                                  {result.type === 'repo' && !isSharePoint && (
                                    <div className="result-stats">
                                      {result.language && (
                                        <span className="stat-item">
                                          <span className="language-dot" style={{ background: getLanguageColor(result.language) }} aria-hidden="true"></span>
                                          {result.language}
                                        </span>
                                      )}
                                      {result.stars > 0 && (
                                        <span className="stat-item">
                                          <svg viewBox="0 0 16 16" fill="currentColor" className="star-icon" aria-hidden="true" focusable="false">
                                            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                                          </svg>
                                          {result.stars}
                                        </span>
                                      )}
                                      {result.hasPages && (
                                        <span className="stat-item pages-badge">
                                          <svg viewBox="0 0 16 16" fill="currentColor" className="pages-icon" aria-hidden="true" focusable="false">
                                            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75z"/>
                                          </svg>
                                          Pages
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            
                            {/* Show more button */}
                            {msg.results.length > 5 && (
                              <button
                                className="show-more-btn"
                                onClick={() => toggleShowAllResults(index)}
                              >
                                {expandedMessages[index] 
                                  ? `Show fewer results` 
                                  : `Show ${msg.results.length - 5} more results`
                                }
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2"
                                  className={expandedMessages[index] ? 'rotate-180' : ''}
                                  aria-hidden="true"
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Follow-up suggestions */}
                        {msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                          <div className="follow-up-suggestions">
                            <span className="follow-up-label">You might also ask:</span>
                            <div className="follow-up-chips">
                              {msg.followUpSuggestions.map((suggestion, i) => (
                                <button
                                  key={i}
                                  className="follow-up-chip"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Thinking Indicator */}
                  {isSearching && (
                    <div className="message message-assistant" role="status" aria-live="polite">
                      <div className="message-avatar">
                        <img src="/shine-logo.svg" alt="" aria-hidden="true" className="avatar-img" />
                      </div>
                      <div className="message-bubble bubble-assistant">
                        <div className="thinking-indicator" aria-hidden="true">
                          <span className="thinking-dot"></span>
                          <span className="thinking-dot"></span>
                          <span className="thinking-dot"></span>
                        </div>
                        <span className="thinking-text">Searching connected sources...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Fixed Bottom Input Area */}
            <div className="input-area">
              {/* Source Filter Chips */}
              <div className="source-filters" role="group" aria-label="Filter by source">
                {SOURCE_FILTERS.map((filter) => {
                  const isActive = sourceFilter === filter.id
                  const isConnected = filter.id === 'all' || sourceStatus[filter.id]?.available
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`source-filter-chip ${isActive ? 'active' : ''} ${!isConnected && filter.id !== 'all' ? 'disconnected' : ''}`}
                      onClick={() => setSourceFilter(filter.id)}
                      disabled={!isConnected && filter.id !== 'all'}
                      aria-pressed={isActive}
                      title={!isConnected && filter.id !== 'all' ? `${filter.label} not connected` : `Filter by ${filter.label}`}
                    >
                      <span className="filter-icon" aria-hidden="true">{filter.icon}</span>
                      <span className="filter-label">{filter.label}</span>
                      {filter.id !== 'all' && (
                        <span className={`filter-status-dot ${isConnected ? 'connected' : 'disconnected'}`} aria-hidden="true"></span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Chat Input */}
              <form className="chat-form" onSubmit={handleSubmit}>
                <label htmlFor="search-input" className="visually-hidden">Search query</label>
                <div className="chat-input-wrapper" ref={historyRef} onKeyDown={handleHistoryKeyDown}>
                  <button
                    type="button"
                    className="history-button"
                    onClick={() => setShowHistory(!showHistory)}
                    disabled={isSearching || searchHistory.length === 0}
                    aria-label="Search history"
                    aria-expanded={showHistory}
                    aria-haspopup="listbox"
                    aria-controls="history-listbox"
                    title="Recent searches"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                  <input
                    id="search-input"
                    type="text"
                    className="chat-input"
                    placeholder="What would you like to find?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
                    disabled={isSearching}
                    aria-describedby="search-hint"
                  />
                  <span id="search-hint" className="visually-hidden">
                    Type your search query and press Enter to search. Use the history button to see recent searches.
                  </span>
                  <button 
                    type="submit" 
                    className="send-button"
                    disabled={!query.trim() || isSearching}
                    aria-label="Send message"
                  >
                    {isSearching ? (
                      <span className="spinner" aria-hidden="true"></span>
                    ) : (
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Search History Dropdown */}
                  {showHistory && searchHistory.length > 0 && (
                    <div 
                      id="history-listbox"
                      className="history-dropdown"
                      role="listbox"
                      aria-label="Recent searches"
                    >
                      <div className="history-header">
                        <span>Recent Searches</span>
                      </div>
                      <ul className="history-list">
                        {searchHistory.slice(0, 10).map((item, itemIndex) => (
                          <li key={item.id} role="presentation">
                            <button
                              type="button"
                              className="history-item"
                              role="option"
                              aria-selected={focusedHistoryIndex === itemIndex}
                              ref={el => historyItemsRef.current[itemIndex] = el}
                              onClick={() => handleHistoryClick(item)}
                            >
                              <svg className="history-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                              <span className="history-item-query">{item.query}</span>
                              <span className="history-item-count">{item.resultCount} results</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </form>

              {/* Suggestions - only show when there are messages */}
              {!showWelcome && (
                <div className="suggestions">
                  <span className="suggestions-label">Try:</span>
                  {POPULAR_SEARCHES.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isSearching}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      </div>
    </Layout>
  )
}

// Helper function for language colors
function getLanguageColor(language) {
  const colors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    PHP: '#4F5D95',
    CSS: '#563d7c',
    HTML: '#e34c26',
    Shell: '#89e051',
    Markdown: '#083fa1',
  }
  return colors[language] || '#8b949e'
}

// Helper function for file type icons
function getFileTypeIcon(fileType) {
  const icons = {
    'pdf': '📕',
    'doc': '📘', 'docx': '📘',
    'xls': '📗', 'xlsx': '📗',
    'ppt': '📙', 'pptx': '📙',
    'txt': '📄',
    'md': '📝',
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
    'mp4': '🎬', 'mov': '🎬',
    'mp3': '🎵', 'wav': '🎵',
    'zip': '📦', 'rar': '📦',
  }
  return icons[fileType?.toLowerCase()] || '📄'
}

export default App
