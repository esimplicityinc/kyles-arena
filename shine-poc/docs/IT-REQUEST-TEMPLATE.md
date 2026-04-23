# IT Request: Azure AD App for SHINE Knowledge Search

## Request Summary

We need an Azure AD app registration to connect our SHINE knowledge search tool to SharePoint Online. This will allow employees to search for documents across our SharePoint sites from a single interface.

## What We Need

Please create an Azure AD app registration with:

| Setting | Value |
|---------|-------|
| App Name | SHINE Knowledge Search |
| Account Type | Single tenant (this org only) |
| Redirect URI | http://localhost:3000 (for testing) |

### API Permissions Required

| Permission | Type | Purpose |
|------------|------|---------|
| Sites.Read.All | Application | Search SharePoint sites and content |
| Files.Read.All | Application | Access document metadata and content |

**Admin consent required:** Yes

## What We Need Back

1. Application (client) ID
2. Directory (tenant) ID  
3. Client Secret (send securely)

## Security Information

- **Access level:** Read-only
- **Data handling:** No SharePoint data is stored; only search results are displayed
- **Users:** Internal employees only
- **Purpose:** Proof of concept for unified knowledge search

## Timeline

This is for a POC - whenever you have availability would be appreciated.

## Contact

[Your name]
[Your email]
[Your phone]
