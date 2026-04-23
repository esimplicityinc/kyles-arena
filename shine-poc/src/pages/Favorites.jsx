import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import './Favorites.css'

// Default source status for pages without real-time status
const defaultSourceStatus = {
  sharepoint: 'connected',
  github: 'connected',
  jira: 'connected',
  confluence: 'connected'
}

// Constants
const STORAGE_KEYS = {
  FAVORITES: 'shine_favorites',
  VIEW_MODE: 'shine_favorites_view',
}

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'SharePoint', label: 'SharePoint' },
  { value: 'GitHub', label: 'GitHub' },
  { value: 'Jira', label: 'Jira' },
  { value: 'Confluence', label: 'Confluence' },
]

function Favorites() {
  const [favorites, setFavorites] = useState([])
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE)
    return saved || 'grid'
  })
  const [sourceFilter, setSourceFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES)
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse favorites:', e)
        setFavorites([])
      }
    }
  }, [])

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode)
  }, [viewMode])

  // Filter favorites based on source and search query
  const filteredFavorites = useMemo(() => {
    return favorites.filter(fav => {
      // Source filter
      if (sourceFilter !== 'all' && fav.source !== sourceFilter) {
        return false
      }
      
      // Search filter (search in title and description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const titleMatch = fav.title?.toLowerCase().includes(query)
        const descMatch = fav.description?.toLowerCase().includes(query)
        return titleMatch || descMatch
      }
      
      return true
    })
  }, [favorites, sourceFilter, searchQuery])

  const removeFavorite = (url) => {
    const updated = favorites.filter(f => f.url !== url)
    setFavorites(updated)
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated))
  }

  const clearAllFavorites = () => {
    if (window.confirm('Are you sure you want to remove all favorites? This cannot be undone.')) {
      setFavorites([])
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([]))
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getSourceIcon = (source) => {
    const icons = {
      SharePoint: '📄',
      GitHub: '💻',
      Jira: '📋',
      Confluence: '📝',
    }
    return icons[source] || '📎'
  }

  const getSourceColors = (source) => {
    const colors = {
      SharePoint: { bg: 'rgba(0, 120, 212, 0.1)', color: '#0078d4', border: '#0078d4' },
      GitHub: { bg: 'rgba(36, 41, 46, 0.1)', color: '#24292e', border: '#24292e' },
      Jira: { bg: 'rgba(0, 82, 204, 0.1)', color: '#0052cc', border: '#0052cc' },
      Confluence: { bg: 'rgba(0, 101, 255, 0.1)', color: '#0065ff', border: '#0065ff' },
    }
    return colors[source] || { bg: '#F3F0F5', color: '#8B7A9E', border: '#8B7A9E' }
  }

  const hasFilters = sourceFilter !== 'all' || searchQuery.trim() !== ''
  const showEmptyState = filteredFavorites.length === 0

  return (
    <Layout sourceStatus={defaultSourceStatus} currentPage="favorites">
      <div className="favorites-page">
        {/* Main Content */}
        <main className="favorites-main" id="favorites-main">
          <h1 className="visually-hidden">SHINE Favorites</h1>
          
          {/* Toolbar */}
          <div className="favorites-toolbar">
            <div className="favorites-toolbar-left">
              {/* Search within favorites */}
              <div className="favorites-search-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  className="favorites-search-input"
                  placeholder="Search favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search within favorites"
                />
                {searchQuery && (
                  <button 
                    className="favorites-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>

              {/* Source filter */}
              <div className="favorites-filter-wrapper">
                <label htmlFor="source-filter" className="visually-hidden">
                  Filter by source
                </label>
                <select
                  id="source-filter"
                  className="favorites-filter-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FilterIcon />
              </div>
            </div>

            <div className="favorites-toolbar-right">
              {/* Results count */}
              <span className="favorites-count">
                {filteredFavorites.length} {filteredFavorites.length === 1 ? 'item' : 'items'}
                {hasFilters && favorites.length !== filteredFavorites.length && (
                  <span className="favorites-count-total"> of {favorites.length}</span>
                )}
              </span>

              {/* View toggle */}
              <div className="favorites-view-toggle" role="radiogroup" aria-label="View mode">
                <button
                  className={`favorites-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <GridIcon />
                </button>
                <button
                  className={`favorites-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                  title="List view"
                >
                  <ListIcon />
                </button>
              </div>

              {/* Clear all button */}
              {favorites.length > 0 && (
                <button 
                  onClick={clearAllFavorites} 
                  className="favorites-btn favorites-btn-danger"
                  aria-label="Clear all favorites"
                >
                  <ClearIcon />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Content */}
        {showEmptyState ? (
          <div className="favorites-empty">
            <div className="favorites-empty-icon">
              <StarIcon />
            </div>
            {favorites.length === 0 ? (
              <>
                <h2>No favorites yet</h2>
                <p>Star search results to save them here for quick access.</p>
                <Link to="/" className="favorites-btn favorites-btn-primary">
                  Start Searching
                </Link>
              </>
            ) : (
              <>
                <h2>No matches found</h2>
                <p>Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('')
                    setSourceFilter('all')
                  }}
                  className="favorites-btn favorites-btn-secondary"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`favorites-grid ${viewMode === 'list' ? 'favorites-list-view' : ''}`}>
            {filteredFavorites.map((favorite) => {
              const sourceColors = getSourceColors(favorite.source)
              
              return (
                <article 
                  key={favorite.url} 
                  className={`favorite-card ${viewMode === 'list' ? 'favorite-card-list' : ''}`}
                  style={{ '--source-border-color': sourceColors.border }}
                >
                  <div className="favorite-card-header">
                    <div 
                      className="favorite-card-source"
                      style={{ background: sourceColors.bg, color: sourceColors.color }}
                    >
                      <span className="favorite-card-source-icon" aria-hidden="true">
                        {getSourceIcon(favorite.source)}
                      </span>
                      <span className="favorite-card-source-name">{favorite.source || 'Unknown'}</span>
                    </div>
                    <button
                      className="favorite-card-remove"
                      onClick={() => removeFavorite(favorite.url)}
                      aria-label={`Remove ${favorite.title} from favorites`}
                      title="Remove from favorites"
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  <h3 className="favorite-card-title">
                    <a 
                      href={favorite.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="favorite-card-link"
                    >
                      {favorite.title || 'Untitled'}
                      <ExternalIcon />
                    </a>
                  </h3>

                  {favorite.description && (
                    <p className="favorite-card-description">
                      {favorite.description}
                    </p>
                  )}

                  <div className="favorite-card-footer">
                    <span className="favorite-card-date">
                      <CalendarIcon />
                      Saved {formatDate(favorite.favoritedAt)}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        </main>
      </div>
    </Layout>
  )
}

// Icons - all decorative icons have aria-hidden and focusable attributes
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="external-link-icon" aria-hidden="true" focusable="false">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default Favorites
