# SHINE Curated - SharePoint Setup Guide

This document describes how to set up the SharePoint infrastructure for SHINE Curated content.

## Overview

SHINE Curated provides a place to store content that doesn't live in other searchable systems. It uses SharePoint as the backend, which means:

- ✅ No new integration needed (already searching SharePoint)
- ✅ Built-in permissions and approval workflows
- ✅ Microsoft Graph API support
- ✅ Familiar to content owners

## SharePoint Structure

### Site: SHINE Hub

Create a new SharePoint site to house all SHINE Curated content.

**Recommended settings:**
- **Type:** Team Site (with Microsoft 365 group)
- **Name:** SHINE Hub
- **URL:** `https://[tenant].sharepoint.com/sites/shine-hub`
- **Privacy:** Private (invite only)

---

## Document Library: SHINE Curated Documents

For storing files (PDFs, Word docs, spreadsheets, etc.)

### Create the Library

1. Go to SHINE Hub site
2. Click **New** → **Document library**
3. Name: `SHINE Curated Documents`

### Add Columns

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| Description | Multiple lines of text | Yes | Brief summary of the document |
| Tags | Managed Metadata or Choice | Recommended | Keywords for search |
| ContentOwner | Person | Yes | Person responsible for approvals |
| SubmittedBy | Person | No | Auto-populated if using form |
| SubmittedDate | Date | No | Auto-populated |
| Status | Choice | Yes | Draft, Pending, Approved, Rejected, Archived |
| Category | Choice | Recommended | e.g., Policy, Template, Guide, Reference |

### Enable Content Approval

1. Go to Library Settings → Versioning settings
2. Set **Require content approval?** to **Yes**
3. Set **Who should see draft items?** to "Only users who can approve items"

### Set Up Permissions

| Group | Permission Level |
|-------|------------------|
| SHINE Admins | Full Control |
| Content Owners | Contribute + Approve |
| All Employees | Read (approved items only) |

---

## List: SHINE Curated Links

For storing bookmarks/pointers to external resources.

### Create the List

1. Go to SHINE Hub site
2. Click **New** → **List** → **Blank list**
3. Name: `SHINE Curated Links`

### Add Columns

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| Title | Single line of text | Yes | Display name for the link |
| URL | Hyperlink | Yes | The actual link |
| Description | Multiple lines of text | Yes | Why this link is useful |
| Tags | Managed Metadata or Choice | Recommended | Keywords for search |
| ContentOwner | Person | Yes | Person responsible |
| SubmittedBy | Person | No | Who submitted |
| Status | Choice | Yes | Pending, Approved, Rejected |
| Category | Choice | Recommended | e.g., Tool, Reference, External Doc |

### Enable Content Approval

Same as Document Library - enable via List Settings → Versioning settings.

---

## List: SHINE Knowledge Base

For FAQ-style entries and knowledge snippets.

### Create the List

1. Go to SHINE Hub site
2. Click **New** → **List** → **Blank list**
3. Name: `SHINE Knowledge Base`

### Add Columns

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| Title | Single line of text | Yes | The question or topic |
| Answer | Multiple lines of text (Rich) | Yes | The answer or content |
| Tags | Managed Metadata or Choice | Recommended | Keywords for search |
| ContentOwner | Person | Yes | SME responsible |
| Status | Choice | Yes | Pending, Approved, Rejected |
| Category | Choice | Recommended | e.g., FAQ, How-To, Definition |
| RelatedLinks | Multiple lines of text | No | Links to related resources |

---

## Search Configuration

Ensure the SHINE Curated content is searchable via Microsoft Graph API.

### Verify Crawl

1. Content should be crawled automatically
2. Wait 15-30 minutes after creating content
3. Test via Graph Explorer: `https://developer.microsoft.com/en-us/graph/graph-explorer`

### Search Query Example

```
GET /search/query
{
  "requests": [
    {
      "entityTypes": ["driveItem", "listItem"],
      "query": {
        "queryString": "path:\"sites/shine-hub\" AND status:Approved"
      }
    }
  ]
}
```

---

## Approval Workflow Options

### Option 1: Built-in Content Approval (Simplest)

**How it works:**
- User uploads/creates item → Status = "Pending"
- Content Owner receives email notification
- Approves/Rejects via SharePoint
- Approved items become visible to readers

**Setup:** Already configured via Versioning settings above.

### Option 2: Power Automate Flow (More Control)

**Benefits:**
- Custom notifications (Teams, Slack, etc.)
- Multi-step approvals
- Automatic metadata population
- Audit trail

**Basic Flow:**

```
Trigger: When an item is created or modified
    ↓
Condition: Status = "Pending"
    ↓
Action: Send approval to Content Owner
    ↓
If Approved:
    - Update Status to "Approved"
    - Send notification to submitter
If Rejected:
    - Update Status to "Rejected"
    - Send feedback to submitter
```

### Option 3: SHINE Admin Panel (Future - Phase 2)

Full approval management within SHINE UI.

---

## Integration with SHINE

### Update SharePoint MCP Server

The existing SharePoint MCP server needs to be configured to include SHINE Hub:

```javascript
// In sharepoint-server.js or configuration

const SHINE_CURATED_SITES = [
  'sites/shine-hub'
];

// Modify search to include SHINE Curated
const searchShineCurated = async (query) => {
  const results = await graphClient
    .api('/search/query')
    .post({
      requests: [{
        entityTypes: ['driveItem', 'listItem'],
        query: {
          queryString: `${query} AND path:"sites/shine-hub" AND SHINEStatus:Approved`
        }
      }]
    });
  return results;
};
```

### Permissions

The SharePoint connection must have access to the SHINE Hub site:
- Ensure the app registration has `Sites.Read.All` or specific site permissions
- Or use delegated permissions with user context

---

## Checklist

### Initial Setup
- [ ] Create SHINE Hub SharePoint site
- [ ] Create SHINE Curated Documents library
- [ ] Create SHINE Curated Links list
- [ ] Create SHINE Knowledge Base list
- [ ] Configure columns on all three
- [ ] Enable Content Approval on all three
- [ ] Set up permissions

### Testing
- [ ] Upload a test document → verify approval flow
- [ ] Add a test link → verify it appears after approval
- [ ] Create a test knowledge entry → verify searchable
- [ ] Test Graph API search includes SHINE Hub content

### Integration
- [ ] Update SharePoint MCP server configuration
- [ ] Test SHINE search returns curated content
- [ ] Verify approved vs. pending filtering works

---

## Support

For questions about this setup, contact the SHINE team.
