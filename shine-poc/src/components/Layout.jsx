import React, { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import './Layout.css';

/**
 * Layout component for SHINE POC
 * Provides top navigation with tabs, source status indicators, and mobile hamburger menu
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to render
 * @param {Object} props.sourceStatus - Status for each source { sharepoint, github, jira, confluence }
 *   Each value should be 'connected' | 'degraded' | 'disconnected'
 * @param {string} props.currentPage - Active page identifier ('chat' | 'favorites' | 'analytics' | 'sources')
 */
function Layout({ children, sourceStatus = {}, currentPage = 'chat' }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Navigation items configuration
  const navItems = [
    { id: 'chat', label: 'Ask SHINE', path: '/' },
    { id: 'favorites', label: 'Favorites', path: '/favorites' },
    { id: 'analytics', label: 'Analytics', path: '/analytics' },
    { id: 'sources', label: 'Sources', path: '/sources' },
  ];

  // Source configuration with display names
  const sources = [
    { id: 'sharepoint', name: 'SharePoint' },
    { id: 'github', name: 'GitHub' },
    { id: 'jira', name: 'Jira' },
    { id: 'confluence', name: 'Confluence' },
  ];

  /**
   * Get CSS class for status dot based on connection status
   */
  const getStatusClass = (status) => {
    switch (status) {
      case 'connected':
        return 'layout-status-dot--connected';
      case 'degraded':
        return 'layout-status-dot--degraded';
      case 'disconnected':
      default:
        return 'layout-status-dot--disconnected';
    }
  };

  /**
   * Get accessible label for status
   */
  const getStatusLabel = (status) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'degraded':
        return 'Slow or degraded';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header__container">
          {/* Logo / Brand */}
          <div className="layout-header__brand">
            <NavLink to="/" className="layout-logo" aria-label="SHINE Home">
              <span className="layout-logo__icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" fill="url(#shine-gradient)" />
                  <path d="M16 8L18 14L24 16L18 18L16 24L14 18L8 16L14 14L16 8Z" fill="white" />
                  <defs>
                    <linearGradient id="shine-gradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A662FF" />
                      <stop offset="1" stopColor="#3F0579" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span className="layout-logo__text">SHINE</span>
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <nav className="layout-nav" aria-label="Main navigation">
            <ul className="layout-nav__list">
              {navItems.map(item => (
                <li key={item.id} className="layout-nav__item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `layout-nav__link ${isActive || currentPage === item.id ? 'layout-nav__link--active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Source Status Indicators (Desktop) */}
          <div className="layout-sources" aria-label="Data source status">
            {sources.map(source => {
              const status = sourceStatus[source.id] || 'disconnected';
              return (
                <div
                  key={source.id}
                  className="layout-source"
                  title={`${source.name}: ${getStatusLabel(status)}`}
                >
                  <span
                    className={`layout-status-dot ${getStatusClass(status)}`}
                    aria-hidden="true"
                  />
                  <span className="layout-source__name">{source.name}</span>
                  <span className="visually-hidden">
                    {source.name}: {getStatusLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="layout-hamburger"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="layout-hamburger__bar" aria-hidden="true" />
            <span className="layout-hamburger__bar" aria-hidden="true" />
            <span className="layout-hamburger__bar" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <>
            <div
              className="layout-mobile-overlay"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <nav
              id="mobile-menu"
              className="layout-mobile-menu"
              aria-label="Mobile navigation"
            >
              <ul className="layout-mobile-menu__list">
                {navItems.map(item => (
                  <li key={item.id} className="layout-mobile-menu__item">
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `layout-mobile-menu__link ${isActive || currentPage === item.id ? 'layout-mobile-menu__link--active' : ''}`
                      }
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              {/* Source Status in Mobile Menu */}
              <div className="layout-mobile-menu__sources">
                <span className="layout-mobile-menu__sources-label">Source Status</span>
                <div className="layout-mobile-menu__sources-list">
                  {sources.map(source => {
                    const status = sourceStatus[source.id] || 'disconnected';
                    return (
                      <div key={source.id} className="layout-mobile-source">
                        <span
                          className={`layout-status-dot ${getStatusClass(status)}`}
                          aria-hidden="true"
                        />
                        <span className="layout-mobile-source__name">{source.name}</span>
                        <span className="layout-mobile-source__status">
                          {getStatusLabel(status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </nav>
          </>
        )}
      </header>

      {/* Main Content Area */}
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}

export default Layout;
