# SHINE MCP Servers

MCP (Model Context Protocol) servers providing SharePoint, GitHub, Jira, and Confluence search capabilities for AI agents.

## Available Servers

### Orchestrator (`orchestrator.js`) - Recommended

The intelligent "brain" of SHINE that unifies search across all sources. **This is the recommended server for most use cases.**

Features:
- Automatic intent detection to route queries to relevant sources
- Parallel search execution with timeout handling
- Result aggregation, deduplication, and relevance ranking
- Graceful degradation if individual sources fail

### SharePoint Server (`sharepoint-server.js`)

Provides access to SharePoint content via Microsoft Graph API.

### GitHub Server (`github-server.js`)

Provides search and file access to GitHub repositories within the organization.

### Jira Server (`jira-server.js`)

Provides issue search and project access to Jira Cloud via REST API.

### Confluence Server (`confluence-server.js`)

Provides content search and page access to Confluence Cloud via REST API. Uses the same Atlassian credentials as Jira.

---

## Orchestrator Tools (Recommended)

### shine_search

Universal search across all configured sources. Automatically detects which sources are most relevant based on query intent.

**Parameters:**
- `query` (required): Natural language search query
- `sources` (optional): Array to limit search - `['sharepoint', 'github', 'jira', 'confluence']`
- `maxResults` (optional): Max results per source (default: 10)

**Example:**
```json
{
  "query": "authentication implementation",
  "maxResults": 15
}
```

**Response:**
```json
{
  "query": "authentication implementation",
  "intent": {
    "detectedSources": ["github"],
    "confidence": 0.7,
    "reasoning": "code/technical terms detected"
  },
  "results": [
    {
      "title": "auth.js",
      "description": "Found in src/auth.js",
      "url": "https://github.com/...",
      "source": "GitHub",
      "type": "code",
      "relevanceScore": 0.92
    }
  ],
  "totalResults": 5,
  "searchDuration": 1.24,
  "sourceStatus": {
    "github": { "searched": true, "resultCount": 5, "error": null }
  }
}
```

### shine_ask

Ask a question about organizational knowledge. Searches across all relevant sources with optional context.

**Parameters:**
- `question` (required): Your question in natural language
- `context` (optional): Additional context (e.g., project name, team)

**Example:**
```json
{
  "question": "How do I submit a SOW for review?",
  "context": "Project Apollo"
}
```

### shine_status

Check which data sources are available and configured.

**Parameters:** None

**Example Response:**
```json
{
  "summary": "4/4 sources available",
  "sources": {
    "sharepoint": { "available": true, "error": null },
    "github": { "available": true, "error": null },
    "jira": { "available": true, "error": null },
    "confluence": { "available": true, "error": null }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Intent Detection

The orchestrator automatically detects which sources to search based on query content:

| Query Pattern | Sources | Example |
|---------------|---------|---------|
| Code/technical terms | GitHub | "function", "api", "implementation", "commit" |
| Document terms | SharePoint | "policy", "template", "SOW", "proposal", "guide" |
| Task/issue terms | Jira | "ticket", "bug", "sprint", "assigned", "status" |
| Wiki/knowledge terms | Confluence | "wiki", "how-to", "runbook", "architecture", "specification" |
| Project terms | SharePoint + Jira + Confluence | "project", "initiative", "deliverable" |
| People queries | All | "who", "assigned to", "created by", "owner" |

If no specific intent is detected, all configured sources are searched.

---

## SharePoint Tools

### sharepoint_search

Search for documents, files, and content across SharePoint.

**Parameters:**
- `query` (required): Search keywords or phrases
- `contentTypes` (optional): Array of `['files', 'sites', 'lists', 'all']`
- `maxResults` (optional): Max results to return (default: 25)

### sharepoint_list_sites

List all accessible SharePoint sites.

### sharepoint_get_file_info

Get details about a specific file.

**Parameters:**
- `fileUrl` (required): The SharePoint URL of the file

---

## GitHub Tools

### github_search

Search for code and repositories across the GitHub organization. Combines results from both code and repository searches.

**Parameters:**
- `query` (required): Search keywords, function names, class names, or phrases
- `searchType` (optional): What to search - `'all'` (default), `'code'`, or `'repositories'`
- `maxResults` (optional): Max results per type (default: 10, max: 100)

**Example:**
```json
{
  "query": "authentication middleware",
  "searchType": "code",
  "maxResults": 15
}
```

### github_search_code

Search specifically for code files with filtering options. Best for finding specific implementations or code patterns.

**Parameters:**
- `query` (required): Code snippets, function names, variable names, or keywords
- `fileExtension` (optional): Filter by extension without the dot (e.g., `'js'`, `'py'`, `'md'`)
- `path` (optional): Filter by path prefix (e.g., `'src/'`, `'docs/'`)
- `maxResults` (optional): Max results (default: 25, max: 100)

**Example:**
```json
{
  "query": "useEffect cleanup",
  "fileExtension": "tsx",
  "path": "src/hooks",
  "maxResults": 20
}
```

### github_list_repos

List all repositories in the GitHub organization.

**Parameters:**
- `sortBy` (optional): How to sort - `'updated'` (default), `'stars'`, or `'name'`
- `maxResults` (optional): Max results (default: 25, max: 100)

**Example:**
```json
{
  "sortBy": "stars",
  "maxResults": 50
}
```

### github_get_file_content

Get the full content of a specific file from a repository.

**Parameters:**
- `repoName` (required): Repository name (e.g., `'my-project'`)
- `filePath` (required): Path to file (e.g., `'src/index.js'`)
- `branch` (optional): Branch name (default: `'main'`)

**Example:**
```json
{
  "repoName": "shine-poc",
  "filePath": "README.md",
  "branch": "main"
}
```

---

## Jira Tools

### jira_search

Search for Jira issues using JQL or text search. Plain text queries are automatically converted to JQL text searches.

**Parameters:**
- `query` (required): Search query - plain text or JQL syntax
- `projectKey` (optional): Filter by project key (e.g., `'PROJ'`)
- `issueType` (optional): Filter by type - `'Bug'`, `'Task'`, `'Story'`, `'Epic'`, `'Sub-task'`
- `status` (optional): Filter by status (e.g., `'Open'`, `'In Progress'`, `'Done'`)
- `maxResults` (optional): Max results (default: 25, max: 100)

**Example - Text search:**
```json
{
  "query": "authentication bug",
  "projectKey": "SHINE",
  "maxResults": 10
}
```

**Example - JQL search:**
```json
{
  "query": "project = SHINE AND status = 'In Progress' AND assignee = currentUser()",
  "maxResults": 20
}
```

### jira_get_issue

Get detailed information about a specific issue by its key.

**Parameters:**
- `issueKey` (required): The issue key (e.g., `'PROJ-123'`)

**Example:**
```json
{
  "issueKey": "SHINE-42"
}
```

### jira_list_projects

List all accessible Jira projects.

**Parameters:**
- `maxResults` (optional): Max projects to return (default: 50, max: 100)

### jira_get_project_issues

Get recent issues from a specific project.

**Parameters:**
- `projectKey` (required): The project key (e.g., `'PROJ'`)
- `status` (optional): Filter by status
- `maxResults` (optional): Max results (default: 25, max: 100)

**Example:**
```json
{
  "projectKey": "SHINE",
  "status": "Open",
  "maxResults": 15
}
```

---

## Confluence Tools

### confluence_search

Search for Confluence content using text search or CQL (Confluence Query Language). Plain text queries are automatically converted to CQL text searches.

**Parameters:**
- `query` (required): Search query - plain text or CQL syntax
- `spaceKey` (optional): Filter by space key (e.g., `'DOCS'`)
- `contentType` (optional): Filter by type - `'page'`, `'blogpost'`, `'all'`
- `maxResults` (optional): Max results (default: 25, max: 100)

**Example - Text search:**
```json
{
  "query": "deployment guide",
  "spaceKey": "ENG",
  "maxResults": 10
}
```

**Example - CQL search:**
```json
{
  "query": "space = ENG AND type = page AND text ~ \"kubernetes\"",
  "maxResults": 20
}
```

### confluence_get_page

Get detailed information about a specific page by its ID.

**Parameters:**
- `pageId` (required): The page ID (numeric, e.g., `'123456789'`)

**Example:**
```json
{
  "pageId": "123456789"
}
```

### confluence_list_spaces

List all accessible Confluence spaces.

**Parameters:**
- `maxResults` (optional): Max spaces to return (default: 50, max: 100)

---

## Setup

### 1. Install dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure credentials

Create or update the parent `.env` file with:

```env
# SharePoint (Microsoft Graph API)
VITE_MS_CLIENT_ID=your-client-id
VITE_MS_CLIENT_SECRET=your-client-secret
VITE_MS_TENANT_ID=your-tenant-id

# GitHub
VITE_GITHUB_TOKEN=your-github-personal-access-token
VITE_GITHUB_ORG=esimplicityinc

# Jira Cloud
VITE_JIRA_EMAIL=your-atlassian-email@example.com
VITE_JIRA_API_TOKEN=your-jira-api-token
VITE_JIRA_BASE_URL=https://esimplicity.atlassian.net

# Confluence Cloud (uses same Atlassian credentials as Jira)
VITE_CONFLUENCE_BASE_URL=https://esimplicity.atlassian.net/wiki
```

**GitHub Token Requirements:**
- Create a Personal Access Token (classic) or Fine-grained token
- Required scopes: `repo` (read access to repositories)
- For code search, the token owner must have access to the repositories

**Jira API Token Requirements:**
- Create an API token at https://id.atlassian.com/manage-profile/security/api-tokens
- Use your Atlassian account email address
- The token provides access to all Jira projects your account can access

**Confluence:** Uses the same Atlassian credentials as Jira. No additional setup required.

### 3. Run the servers

```bash
# Orchestrator (recommended - unified search)
npm run orchestrator
# or
node orchestrator.js

# SharePoint server (standalone)
npm run sharepoint
# or
node sharepoint-server.js

# GitHub server (standalone)
npm run github
# or
node github-server.js

# Jira server (standalone)
npm run jira
# or
node jira-server.js

# Confluence server (standalone)
npm run confluence
# or
node confluence-server.js
```

---

## Using with Claude Desktop

Add to your Claude Desktop config file:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Recommended: Use the Orchestrator

The orchestrator provides unified search across all sources with intelligent routing:

```json
{
  "mcpServers": {
    "shine-orchestrator": {
      "command": "node",
      "args": ["/path/to/shine-poc/mcp-server/orchestrator.js"],
      "env": {
        "VITE_MS_CLIENT_ID": "your-client-id",
        "VITE_MS_CLIENT_SECRET": "your-client-secret",
        "VITE_MS_TENANT_ID": "your-tenant-id",
        "VITE_GITHUB_TOKEN": "your-github-token",
        "VITE_GITHUB_ORG": "your-org",
        "VITE_JIRA_EMAIL": "your-email",
        "VITE_JIRA_API_TOKEN": "your-api-token",
        "VITE_JIRA_BASE_URL": "https://your-instance.atlassian.net",
        "VITE_CONFLUENCE_BASE_URL": "https://your-instance.atlassian.net/wiki"
      }
    }
  }
}
```

### Alternative: Individual Servers

If you prefer granular control or only need specific sources:

```json
{
  "mcpServers": {
    "shine-sharepoint": {
      "command": "node",
      "args": ["/path/to/shine-poc/mcp-server/sharepoint-server.js"]
    },
    "shine-github": {
      "command": "node",
      "args": ["/path/to/shine-poc/mcp-server/github-server.js"]
    },
    "shine-jira": {
      "command": "node",
      "args": ["/path/to/shine-poc/mcp-server/jira-server.js"]
    },
    "shine-confluence": {
      "command": "node",
      "args": ["/path/to/shine-poc/mcp-server/confluence-server.js"]
    }
  }
}
```

See `claude_config.json` in this directory for a complete example with all options.

---

## Response Format

All tools return results in a consistent format:

```json
{
  "title": "filename.js",
  "description": "Brief description or context",
  "url": "https://...",
  "source": "GitHub",
  "type": "code|repository|file",
  ...additional fields
}
```

### GitHub-specific fields:

- `repo`: Repository name
- `repoUrl`: URL to the repository
- `path`: File path within repo (for code results)
- `webUrl`: GitHub Pages URL if available
- `stars`: Star count (for repositories)
- `language`: Primary language (for repositories)
- `lastModified`: Last update timestamp
- `content`: File contents (for `github_get_file_content`)

### Jira-specific fields:

- `issueKey`: Issue key (e.g., `PROJ-123`)
- `status`: Current issue status
- `priority`: Issue priority
- `assignee`: Assigned user's display name
- `reporter`: Reporter's display name
- `project`: Project name
- `projectKey`: Project key
- `created`: Creation timestamp
- `updated`: Last update timestamp

### Confluence-specific fields:

- `pageId`: Page ID (numeric)
- `spaceKey`: Space key (e.g., `DOCS`)
- `spaceName`: Space display name
- `lastModified`: Last modification timestamp
- `author`: Last modifier's display name
- `bodyContent`: Full page content (for `confluence_get_page`)
- `version`: Page version number (for `confluence_get_page`)
- `status`: Page status (for `confluence_get_page`)

---

## Error Handling

The servers handle common errors gracefully:

- **401 Unauthorized**: Token is invalid or expired
- **403 Forbidden**: Rate limit exceeded or insufficient permissions
- **404 Not Found**: Repository, file, or issue doesn't exist
- **422 Unprocessable**: Invalid search query syntax
- **429 Too Many Requests**: Rate limit exceeded (Jira)

Rate limit information is included in error messages when applicable.

---

## Troubleshooting

### GitHub code search returns no results

- Ensure your token has access to the repositories
- GitHub code search only indexes repositories with recent activity
- Very new repositories may not be indexed yet

### Rate limiting

- GitHub API allows 30 search requests per minute for authenticated users
- Consider caching results or reducing `maxResults` if hitting limits

### SharePoint authentication fails

- Verify client credentials are correct
- Ensure the app has appropriate Graph API permissions
- Check that the tenant ID matches your organization

### Jira authentication fails

- Verify your email matches your Atlassian account
- Ensure the API token is valid and not expired
- Check that the base URL is correct for your Jira instance
- API tokens can be regenerated at https://id.atlassian.com/manage-profile/security/api-tokens

### Jira search returns no results

- Verify you have access to the projects you're searching
- Check your JQL syntax if using raw JQL queries
- Try a broader search to confirm connectivity

### Confluence authentication fails

- Uses the same credentials as Jira (VITE_JIRA_EMAIL and VITE_JIRA_API_TOKEN)
- Verify your Atlassian API token has Confluence access
- Check that VITE_CONFLUENCE_BASE_URL is correct (should end with `/wiki`)

### Confluence search returns no results

- Verify you have access to the spaces you're searching
- Check your CQL syntax if using raw CQL queries
- Try searching without space filters first to confirm connectivity
- Some content types (attachments, comments) may not be indexed

### Orchestrator-specific issues

**Some sources return errors but others work:**
- This is expected behavior - the orchestrator provides graceful degradation
- Check `sourceStatus` in the response to see which sources failed
- Use `shine_status` to verify which sources are properly configured

**Intent detection routing to wrong sources:**
- Use the `sources` parameter to explicitly specify which sources to search
- Example: `{ "query": "...", "sources": ["sharepoint", "jira", "confluence"] }`

**Timeout errors:**
- Individual source searches timeout after 5 seconds by default
- Slow network or large result sets may trigger timeouts
- Try reducing `maxResults` for faster responses
