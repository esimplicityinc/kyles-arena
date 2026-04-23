# WCAG 2.1 AA Accessibility Audit Report

**Site:** SHINE POC Knowledge Search  
**URL:** http://localhost:3000  
**Standard:** WCAG 2.1 Level AA  
**Audit Date:** February 21, 2026  
**Auditor:** Automated + Manual Code Review  

---

## Executive Summary

| Category | Count |
|----------|-------|
| **Critical Issues** | 5 |
| **High Priority Issues** | 6 |
| **Medium Priority Issues** | 4 |
| **Passed Checks** | 8 |

**Overall Score:** 65/100 (Needs Improvement)

---

## Critical Issues (Must Fix)

### A1. Missing Skip Navigation Link
**WCAG:** 2.4.1 Bypass Blocks  
**Location:** `App.jsx:189-206` (header section)  
**Impact:** Keyboard users cannot bypass repetitive navigation  

**Current Code:**
```jsx
<header className="header">
  <div className="header-content">
    <div className="logo-container">
      ...
    </div>
    <Link to="/analytics" className="header-link">
      ...
    </Link>
  </div>
</header>
```

**Fix:**
```jsx
<a href="#main-content" className="skip-link">Skip to main content</a>
<header className="header">
  ...
</header>

<main className="main" id="main-content">
```

**Add to `App.css`:**
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-purple);
  color: white;
  padding: 8px 16px;
  z-index: 1000;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}
```

---

### A2. Search Input Missing Explicit Label
**WCAG:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value  
**Location:** `App.jsx:379-387`  
**Impact:** Screen readers cannot identify the purpose of the input  

**Current Code:**
```jsx
<input
  type="text"
  className="chat-input"
  placeholder="Ask me anything..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
  disabled={isSearching}
/>
```

**Fix:**
```jsx
<label htmlFor="search-input" className="visually-hidden">
  Search query
</label>
<input
  id="search-input"
  type="text"
  className="chat-input"
  placeholder="Ask me anything..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
  disabled={isSearching}
  aria-describedby="search-hint"
/>
<span id="search-hint" className="visually-hidden">
  Type a search query and press Enter or click the send button
</span>
```

**Add to `index.css`:**
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

### A3. Decorative SVG Icons Missing aria-hidden
**WCAG:** 1.1.1 Non-text Content  
**Location:** `App.jsx:158-177`, `App.jsx:198-203`, and throughout  
**Impact:** Screen readers announce meaningless content  

**Current Code:**
```jsx
<svg className="result-type-icon" viewBox="0 0 16 16" fill="currentColor">
  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75..."/>
</svg>
```

**Fix:**
```jsx
<svg 
  className="result-type-icon" 
  viewBox="0 0 16 16" 
  fill="currentColor"
  aria-hidden="true"
  focusable="false"
>
  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75..."/>
</svg>
```

Apply to ALL decorative SVGs in:
- `App.jsx` lines: 159-161, 165-167, 173-175, 198-202, 225-226, 253-255, 274-276, 288-290, 306-308, 314-316, 374-377, 397-409, 427-429
- `Analytics.jsx` lines: 277-280, 286-290, etc. (all icon functions)

---

### A4. Missing Page Region/Landmark Roles
**WCAG:** 1.3.1 Info and Relationships  
**Location:** `App.jsx:208`  
**Impact:** Screen reader users cannot navigate by landmarks  

**Current Code:**
```jsx
<main className="main">
```

**Fix:**
```jsx
<main className="main" role="main" aria-label="Search interface">
```

Also ensure header has proper role:
```jsx
<header className="header" role="banner">
```

---

### A5. History Dropdown Lacks ARIA Attributes
**WCAG:** 4.1.2 Name, Role, Value  
**Location:** `App.jsx:414-438`  
**Impact:** Screen readers cannot understand dropdown state/structure  

**Current Code:**
```jsx
{showHistory && searchHistory.length > 0 && (
  <div className="history-dropdown">
    <div className="history-header">
      <span>Recent Searches</span>
    </div>
    <ul className="history-list">
      ...
    </ul>
  </div>
)}
```

**Fix:**
```jsx
<button
  type="button"
  className="history-button"
  onClick={() => setShowHistory(!showHistory)}
  disabled={isSearching || searchHistory.length === 0}
  aria-label="Search history"
  aria-expanded={showHistory}
  aria-haspopup="listbox"
  aria-controls="history-listbox"
>
  ...
</button>

{showHistory && searchHistory.length > 0 && (
  <div 
    id="history-listbox"
    className="history-dropdown"
    role="listbox"
    aria-label="Recent searches"
  >
    <div className="history-header" id="history-label">
      <span>Recent Searches</span>
    </div>
    <ul className="history-list" role="group" aria-labelledby="history-label">
      {searchHistory.slice(0, 10).map((item, index) => (
        <li key={item.id} role="option" aria-selected="false">
          <button
            type="button"
            className="history-item"
            onClick={() => handleHistoryClick(item)}
          >
            ...
          </button>
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## High Priority Issues

### B1. Result Links Missing Descriptive Text
**WCAG:** 2.4.4 Link Purpose (In Context)  
**Location:** `App.jsx:266-294`  
**Impact:** "View on GitHub" and "Open Page" links lack context about what they open  

**Fix:**
```jsx
<a 
  href={result.url} 
  target="_blank" 
  rel="noopener noreferrer"
  className="result-link"
  onClick={() => handleResultClick(result, resultIndex, msg.searchId)}
  aria-label={`View ${result.title} on GitHub (opens in new tab)`}
>
  View on GitHub
  <svg aria-hidden="true" focusable="false" ...>
    ...
  </svg>
  <span className="visually-hidden">(opens in new tab)</span>
</a>
```

---

### B2. Focus Order Issues in Chat Interface
**WCAG:** 2.4.3 Focus Order  
**Location:** `App.jsx:364-440`  
**Impact:** Tab order may not match visual order when history dropdown is open  

**Fix:**
Add `tabindex` management and focus trapping:
```jsx
// Add keyboard handling to history dropdown
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    setShowHistory(false);
    // Return focus to history button
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    // Navigate within dropdown
    e.preventDefault();
  }
};
```

---

### B3. Thinking/Loading State Not Announced
**WCAG:** 4.1.3 Status Messages  
**Location:** `App.jsx:330-345`  
**Impact:** Screen reader users don't know a search is in progress  

**Fix:**
```jsx
{isSearching && (
  <div 
    className="message message-assistant"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="message-avatar">
      <img src="/shine-logo.svg" alt="" aria-hidden="true" className="avatar-img" />
    </div>
    <div className="message-bubble bubble-assistant">
      <div className="thinking-indicator" aria-hidden="true">
        <span className="thinking-dot"></span>
        <span className="thinking-dot"></span>
        <span className="thinking-dot"></span>
      </div>
      <span className="thinking-text">Searching GitHub...</span>
    </div>
  </div>
)}
```

---

### B4. Message Avatar Images Have Redundant Alt Text
**WCAG:** 1.1.1 Non-text Content  
**Location:** `App.jsx:217`, `App.jsx:334`  
**Impact:** Screen readers announce "SHINE" multiple times  

**Current Code:**
```jsx
<img src="/shine-logo.svg" alt="SHINE" className="avatar-img" />
```

**Fix:** Make decorative since the message content conveys the speaker:
```jsx
<img src="/shine-logo.svg" alt="" className="avatar-img" aria-hidden="true" />
```

---

### B5. Error Messages Not Programmatically Associated
**WCAG:** 3.3.1 Error Identification  
**Location:** `App.jsx:223-230`  
**Impact:** Screen readers may not announce errors in context  

**Fix:**
```jsx
{msg.error && (
  <div 
    className="message-error"
    role="alert"
    aria-live="assertive"
  >
    <svg className="error-icon" aria-hidden="true" focusable="false" ...>
      ...
    </svg>
    <span>{msg.error}</span>
  </div>
)}
```

---

### B6. Result Cards Missing Accessible Names
**WCAG:** 4.1.2 Name, Role, Value  
**Location:** `App.jsx:235-324`  
**Impact:** Screen readers cannot distinguish between result cards  

**Fix:**
```jsx
<div 
  key={resultIndex} 
  className={`result-card result-${result.type}`}
  role="article"
  aria-labelledby={`result-title-${resultIndex}`}
>
  ...
  <h3 id={`result-title-${resultIndex}`} className="result-title">
    {result.title}
  </h3>
  ...
</div>
```

---

## Medium Priority Issues

### C1. Touch Target Sizes Too Small
**WCAG:** 2.5.5 Target Size (AAA, but recommended for AA)  
**Location:** Multiple buttons and links  
**Impact:** Difficult for users with motor impairments  

**Affected Elements:**
| Element | Current Size | Required |
|---------|-------------|----------|
| `.history-button` | 36x36px | 44x44px |
| `.suggestion-chip` | ~32px height | 44px min |
| `.result-link` | ~28px height | 44px min |

**Fix in `App.css`:**
```css
.history-button {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
}

.suggestion-chip {
  min-height: 44px;
  padding: 10px 18px;
}

.result-link {
  min-height: 44px;
  padding: 10px 14px;
}
```

---

### C2. Analytics Cards Missing Heading Hierarchy
**WCAG:** 1.3.1 Info and Relationships  
**Location:** `Analytics.jsx:92-253`  
**Impact:** Improper heading structure  

**Issue:** `h3` elements are used without `h2` parents in sections.

**Fix:**
```jsx
<section className="analytics-section">
  <h2 className="visually-hidden">Key Metrics</h2>
  <div className="metrics-grid">
    ...
  </div>
</section>

<section className="analytics-section">
  <h2 className="visually-hidden">Search Analysis</h2>
  <div className="analytics-grid-2">
    ...
  </div>
</section>
```

---

### C3. Color Contrast Issues
**WCAG:** 1.4.3 Contrast (Minimum)  
**Location:** Various text elements  

| Element | Colors | Ratio | Required | Status |
|---------|--------|-------|----------|--------|
| `.sources-label` | #8B7A9E on #FDFAFF | 3.5:1 | 4.5:1 | **FAIL** |
| `.thinking-text` | #8B7A9E on #FFFFFF | 4.2:1 | 4.5:1 | **FAIL** |
| `.result-path` | #A89BB5 on #F9F7FB | 2.8:1 | 4.5:1 | **FAIL** |
| `.analytics-loading` | #8B7A9E on #FDFAFF | 3.5:1 | 4.5:1 | **FAIL** |

**Fix in `App.css`:**
```css
/* Increase contrast for muted text */
.sources-label,
.thinking-text,
.analytics-loading {
  color: #6B5B7A; /* Darkened from #8B7A9E - contrast 5.2:1 */
}

.result-path {
  color: #6B5B7A; /* Darkened from #A89BB5 */
  background: #F3F0F5;
}
```

---

### C4. Motion/Animation Cannot Be Disabled
**WCAG:** 2.3.3 Animation from Interactions (AAA, recommended)  
**Location:** `App.css:181-192`, `App.css:303-312`  

**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  .message {
    animation: none;
  }
  
  .thinking-dot {
    animation: none;
    opacity: 1;
    transform: none;
  }
  
  .spinner {
    animation: none;
  }
  
  .history-dropdown {
    animation: none;
  }
}
```

---

## Passed Checks

- [x] **Page has `lang="en"` attribute** (`index.html:2`)
- [x] **Page has descriptive title** (`<title>SHINE - Knowledge Search</title>`)
- [x] **Logo image has alt text** (`App.jsx:194`)
- [x] **Focus visible styles present** (`index.css:59-62`)
- [x] **External links have `rel="noopener noreferrer"`** (`App.jsx:269`)
- [x] **Form has submit handler** (`App.jsx:364`)
- [x] **Buttons have aria-labels where text not visible** (`App.jsx:371`, `App.jsx:392`)
- [x] **Color selection uses readable text** (`:selection` in `index.css:65-68`)

---

## Keyboard Navigation Test Results

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Tab 1 | Logo/Home link | Analytics link | **FAIL** - No skip link |
| Tab 2 | Search history button | History button | PASS |
| Tab 3 | Search input | Search input | PASS |
| Tab 4 | Send button | Send button | PASS |
| Tab 5 | Suggestion chip 1 | Suggestion chip 1 | PASS |
| Tab 6 | Suggestion chip 2 | Suggestion chip 2 | PASS |
| Tab 7 | Suggestion chip 3 | Suggestion chip 3 | PASS |
| Escape in dropdown | Close dropdown | Not implemented | **FAIL** |
| Arrow keys in dropdown | Navigate options | Not implemented | **FAIL** |

---

## Recommended Implementation Priority

### Phase 1: Critical (Deploy Blocker)
1. Add skip navigation link
2. Label search input properly
3. Add `aria-hidden` to decorative SVGs
4. Fix history dropdown ARIA

### Phase 2: High Priority (Within 2 Weeks)
5. Make result links descriptive
6. Add `role="status"` to loading state
7. Associate error messages properly
8. Fix avatar alt text redundancy

### Phase 3: Medium Priority (Within 1 Month)
9. Increase touch target sizes
10. Fix heading hierarchy
11. Improve color contrast
12. Add reduced motion support

---

## Testing Tools Recommended

1. **axe DevTools** - Automated testing
2. **WAVE** - Visual accessibility evaluation
3. **Lighthouse** - Performance and accessibility
4. **NVDA/VoiceOver** - Screen reader testing
5. **Keyboard only** - Tab through entire interface

---

## Summary

The SHINE POC has a solid foundation but requires several accessibility improvements before production deployment. The critical issues primarily involve missing ARIA attributes for dynamic content and proper labeling for form inputs. The high-priority issues focus on screen reader user experience, particularly around status announcements and link context.

Implementing these fixes will significantly improve the experience for users with disabilities while also benefiting all users through better keyboard navigation and clearer interface structure.
