import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMetrics, exportAnalytics, clearAnalytics } from '../services/analytics'
import Layout from '../components/Layout'
import './Analytics.css'

// Default source status for pages without real-time status
const defaultSourceStatus = {
  sharepoint: 'connected',
  github: 'connected',
  jira: 'connected',
  confluence: 'connected'
}

// Time range options
const TIME_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
]

function Analytics() {
  const [metrics, setMetrics] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [timeRange, setTimeRange] = useState('all')

  useEffect(() => {
    const data = getMetrics(timeRange)
    setMetrics(data)
  }, [refreshKey, timeRange])

  const handleExport = () => {
    const data = exportAnalytics()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shine-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      clearAnalytics()
      setRefreshKey(k => k + 1)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  if (!metrics) {
    return (
      <Layout sourceStatus={defaultSourceStatus} currentPage="analytics">
        <div className="analytics-page">
          <div className="analytics-loading" role="status" aria-live="polite">
            <span className="visually-hidden">Loading analytics data</span>
            Loading...
          </div>
        </div>
      </Layout>
    )
  }

  const hasData = metrics.totalSearches > 0 || metrics.totalSessions > 0

  return (
    <Layout sourceStatus={defaultSourceStatus} currentPage="analytics">
      <div className="analytics-page">
        {/* Page-specific toolbar */}
        <div className="analytics-toolbar">
          <h1 className="analytics-page-title">Analytics Dashboard</h1>
          <div className="time-range-selector" role="group" aria-label="Select time range">
            {TIME_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                className={`time-range-btn ${timeRange === range.id ? 'active' : ''}`}
                onClick={() => setTimeRange(range.id)}
                aria-pressed={timeRange === range.id}
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="analytics-actions">
            <button onClick={handleRefresh} className="analytics-btn analytics-btn-secondary" aria-label="Refresh analytics data">
              <RefreshIcon />
              Refresh
            </button>
            <button onClick={handleExport} className="analytics-btn analytics-btn-secondary" aria-label="Export analytics data as JSON">
              <ExportIcon />
              Export
            </button>
            <button onClick={handleClear} className="analytics-btn analytics-btn-danger" aria-label="Clear all analytics data">
              <ClearIcon />
              Clear
            </button>
          </div>
        </div>

        <main className="analytics-main" id="analytics-main">
        {!hasData ? (
          <div className="analytics-empty">
            <div className="analytics-empty-icon">
              <ChartIcon />
            </div>
            <h2>No data yet</h2>
            <p>Start using SHINE to see analytics here.</p>
            <Link to="/" className="analytics-btn analytics-btn-primary">
              Go to SHINE
            </Link>
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <section className="analytics-section" aria-labelledby="key-metrics-heading">
              <h2 id="key-metrics-heading" className="visually-hidden">Key Metrics</h2>
              <div className="metrics-grid">
                <MetricCard
                  title="Sessions"
                  value={metrics.totalSessions}
                  subtitle={`${metrics.uniqueUsers} unique user${metrics.uniqueUsers !== 1 ? 's' : ''}`}
                  icon={<SessionIcon />}
                />
                <MetricCard
                  title="Searches"
                  value={metrics.totalSearches}
                  subtitle={`${metrics.searchesPerSession} per session`}
                  icon={<SearchIcon />}
                />
                <MetricCard
                  title="Click Rate"
                  value={`${metrics.clickThroughRate}%`}
                  subtitle={`${metrics.totalClicks} total clicks`}
                  icon={<ClickIcon />}
                />
                <MetricCard
                  title="Avg Results"
                  value={metrics.avgResultsPerSearch}
                  subtitle={`${metrics.avgQueryLength} avg query chars`}
                  icon={<ResultsIcon />}
                />
              </div>
            </section>

            {/* Search Analysis */}
            <section className="analytics-section" aria-labelledby="search-analysis-heading">
              <h2 id="search-analysis-heading" className="visually-hidden">Search Analysis</h2>
              <div className="analytics-grid-2">
                {/* Top Searches */}
                <div className="analytics-card">
                  <h3 className="analytics-card-title">
                    <TrendingIcon />
                    Top Searches
                  </h3>
                  {metrics.topQueries.length > 0 ? (
                    <ul className="analytics-list">
                      {metrics.topQueries.map((item, index) => (
                        <li key={index} className="analytics-list-item">
                          <span className="analytics-list-rank">{index + 1}</span>
                          <span className="analytics-list-text">{item.query}</span>
                          <span className="analytics-list-count">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="analytics-empty-text">No searches yet</p>
                  )}
                </div>

                {/* Zero Result Queries */}
                <div className="analytics-card">
                  <h3 className="analytics-card-title">
                    <WarningIcon />
                    Zero-Result Queries
                  </h3>
                  {metrics.zeroResultQueries.length > 0 ? (
                    <ul className="analytics-list analytics-list-warning">
                      {metrics.zeroResultQueries.map((item, index) => (
                        <li key={index} className="analytics-list-item">
                          <span className="analytics-list-rank">{index + 1}</span>
                          <span className="analytics-list-text">"{item.query}"</span>
                          <span className="analytics-list-count">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="analytics-empty-text analytics-success-text">
                      No zero-result queries
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Click Analysis */}
            <section className="analytics-section" aria-labelledby="click-analysis-heading">
              <h2 id="click-analysis-heading" className="visually-hidden">Click Analysis</h2>
              <div className="analytics-grid-2">
                {/* Most Clicked Results */}
                <div className="analytics-card">
                  <h3 className="analytics-card-title">
                    <StarIcon />
                    Most Clicked Results
                  </h3>
                  {metrics.topClickedResults.length > 0 ? (
                    <ul className="analytics-list">
                      {metrics.topClickedResults.map((item, index) => (
                        <li key={index} className="analytics-list-item">
                          <span className="analytics-list-rank">{index + 1}</span>
                          <span className="analytics-list-text analytics-list-truncate" title={item.title}>
                            {item.title}
                          </span>
                          <span className="analytics-list-count">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="analytics-empty-text">No clicks yet</p>
                  )}
                </div>

                {/* Source Popularity */}
                <div className="analytics-card">
                  <h3 className="analytics-card-title">
                    <SourceIcon />
                    Source Popularity
                  </h3>
                  {metrics.sourcePopularity.length > 0 ? (
                    <div className="source-bars">
                      {metrics.sourcePopularity.map((item, index) => (
                        <div key={index} className="source-bar-item">
                          <div className="source-bar-header">
                            <span className="source-bar-name">{item.source}</span>
                            <span className="source-bar-percent">{item.percentage}%</span>
                          </div>
                          <div className="source-bar-track">
                            <div 
                              className="source-bar-fill" 
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="analytics-empty-text">No click data yet</p>
                  )}
                </div>
              </div>
            </section>

            {/* Additional Stats */}
            <section className="analytics-section" aria-labelledby="additional-stats-heading">
              <h2 id="additional-stats-heading" className="visually-hidden">Additional Statistics</h2>
              <div className="analytics-card analytics-card-full">
                <h3 className="analytics-card-title">
                  <StatsIcon />
                  Additional Statistics
                </h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Searches without clicks</span>
                    <span className="stat-value">{metrics.searchesWithoutClicks}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Unique sessions</span>
                    <span className="stat-value">{metrics.uniqueSessions}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg query length</span>
                    <span className="stat-value">{metrics.avgQueryLength} chars</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total clicks</span>
                    <span className="stat-value">{metrics.totalClicks}</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        </main>
      </div>
    </Layout>
  )
}

// Metric Card Component
function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-card-icon">{icon}</div>
      <div className="metric-card-content">
        <h3 className="metric-card-title">{title}</h3>
        <p className="metric-card-value">{value}</p>
        <p className="metric-card-subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

// Icons - all decorative icons have aria-hidden and focusable attributes
function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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

function ChartIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function SessionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ClickIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function ResultsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function TrendingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function SourceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

export default Analytics
