import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import './Sources.css'

// Mock data - will be replaced with real API later
const mockSourceData = {
  sharepoint: { 
    name: 'SharePoint', 
    icon: '📄', 
    status: 'healthy', 
    lastSync: '2 minutes ago', 
    docCount: 1247, 
    errors: 0 
  },
  github: { 
    name: 'GitHub', 
    icon: '💻', 
    status: 'healthy', 
    lastSync: '5 minutes ago', 
    docCount: 892, 
    errors: 0 
  },
  jira: { 
    name: 'Jira', 
    icon: '📋', 
    status: 'degraded', 
    lastSync: '15 minutes ago', 
    docCount: 2103, 
    errors: 3 
  },
  confluence: { 
    name: 'Confluence', 
    icon: '📝', 
    status: 'healthy', 
    lastSync: '1 minute ago', 
    docCount: 567, 
    errors: 0 
  },
}

function Sources() {
  const [sources, setSources] = useState(mockSourceData)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshAll = () => {
    setRefreshing(true)
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false)
    }, 1500)
  }

  const handleReconnect = (sourceKey) => {
    // Simulate reconnection
    setSources(prev => ({
      ...prev,
      [sourceKey]: {
        ...prev[sourceKey],
        status: 'healthy',
        errors: 0,
        lastSync: 'Just now'
      }
    }))
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'healthy':
        return { color: '#22c55e', text: 'Healthy', className: 'status-healthy' }
      case 'degraded':
        return { color: '#f59e0b', text: 'Degraded', className: 'status-degraded' }
      case 'error':
        return { color: '#ef4444', text: 'Error', className: 'status-error' }
      default:
        return { color: '#6b7280', text: 'Unknown', className: 'status-unknown' }
    }
  }

  // Transform sources to Layout format
  const layoutSourceStatus = {
    sharepoint: sources.sharepoint?.status === 'healthy' ? 'connected' : 
                sources.sharepoint?.status === 'degraded' ? 'degraded' : 'disconnected',
    github: sources.github?.status === 'healthy' ? 'connected' : 
            sources.github?.status === 'degraded' ? 'degraded' : 'disconnected',
    jira: sources.jira?.status === 'healthy' ? 'connected' : 
          sources.jira?.status === 'degraded' ? 'degraded' : 'disconnected',
    confluence: sources.confluence?.status === 'healthy' ? 'connected' : 
                sources.confluence?.status === 'degraded' ? 'degraded' : 'disconnected',
  }

  return (
    <Layout sourceStatus={layoutSourceStatus} currentPage="sources">
      <div className="sources-page">
        <main className="sources-main" id="sources-main">
          {/* Page toolbar */}
          <div className="sources-toolbar">
            <div className="sources-title-section">
              <h1 className="sources-title">Connected Sources</h1>
              <p className="sources-subtitle">
                Monitor the health and sync status of all connected data sources. 
                View document counts, error logs, and reconnect if needed.
              </p>
            </div>
            <div className="sources-actions">
              <button 
                onClick={handleRefreshAll} 
                className="sources-btn sources-btn-secondary"
                disabled={refreshing}
                aria-label="Refresh all data sources"
              >
                <RefreshIcon spinning={refreshing} />
                {refreshing ? 'Refreshing...' : 'Refresh All'}
              </button>
            </div>
          </div>

        <section className="sources-grid" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="visually-hidden">Data Source Status Cards</h2>
          {Object.entries(sources).map(([key, source]) => {
            const statusConfig = getStatusConfig(source.status)
            const isDisconnected = source.status === 'error'
            
            return (
              <article key={key} className="source-card" aria-labelledby={`source-${key}-name`}>
                <div className="source-card-header">
                  <div className="source-icon" aria-hidden="true">{source.icon}</div>
                  <div className="source-info">
                    <h3 id={`source-${key}-name`} className="source-name">{source.name}</h3>
                    <div className={`source-status ${statusConfig.className}`}>
                      <span 
                        className="status-dot" 
                        style={{ backgroundColor: statusConfig.color }}
                        aria-hidden="true"
                      />
                      <span className="status-text">{statusConfig.text}</span>
                    </div>
                  </div>
                </div>

                <div className="source-card-body">
                  <div className="source-stat">
                    <span className="source-stat-label">Last Sync</span>
                    <span className="source-stat-value">{source.lastSync}</span>
                  </div>
                  <div className="source-stat">
                    <span className="source-stat-label">Documents</span>
                    <span className="source-stat-value">{source.docCount.toLocaleString()}</span>
                  </div>
                  {source.errors > 0 && (
                    <div className="source-stat source-stat-error">
                      <span className="source-stat-label">Errors</span>
                      <span className="source-stat-value source-stat-error-value">
                        <WarningIcon />
                        {source.errors}
                      </span>
                    </div>
                  )}
                </div>

                {(isDisconnected || source.errors > 0) && (
                  <div className="source-card-footer">
                    <button 
                      onClick={() => handleReconnect(key)}
                      className="sources-btn sources-btn-reconnect"
                      aria-label={`Reconnect to ${source.name}`}
                    >
                      <ReconnectIcon />
                      Reconnect
                    </button>
                  </div>
                )}
              </article>
            )
          })}
          </section>
        </main>
      </div>
    </Layout>
  )
}

// Icons
function RefreshIcon({ spinning = false }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      aria-hidden="true" 
      focusable="false"
      className={spinning ? 'icon-spinning' : ''}
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      aria-hidden="true" 
      focusable="false"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ReconnectIcon() {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      aria-hidden="true" 
      focusable="false"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default Sources
