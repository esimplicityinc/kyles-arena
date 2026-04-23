# SharePoint Integration Setup for SHINE

## Overview

SHINE needs to connect to SharePoint Online to search documents, lists, and pages. This requires an Azure AD (Entra ID) app registration with Microsoft Graph API permissions.

## What IT Needs to Do

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure:
   - **Name:** `SHINE Knowledge Search`
   - **Supported account types:** "Accounts in this organizational directory only"
   - **Redirect URI:** (leave blank for now, or add `http://localhost:3000` for testing)
4. Click "Register"
5. Note the **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Create Client Secret

1. In the app registration, go to "Certificates & secrets"
2. Click "New client secret"
3. Add a description: `SHINE POC`
4. Choose expiration (recommend 12 months for POC)
5. Click "Add"
6. **Copy the secret value immediately** (you won't see it again)

### Step 3: Add API Permissions

1. Go to "API permissions"
2. Click "Add a permission" → "Microsoft Graph"
3. Choose "Application permissions" (for POC without user login)
4. Add these permissions:
   - `Sites.Read.All` - Read all SharePoint sites
   - `Files.Read.All` - Read all files
5. Click "Grant admin consent for [Organization]"

### Step 4: Provide Credentials to SHINE Team

Send these values securely:
- Application (client) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Directory (tenant) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Client Secret: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Security Notes

- The app will have read-only access to SharePoint content
- No data is stored - SHINE only searches and displays links
- Access can be revoked at any time by deleting the app registration
- Consider using delegated permissions (user login) for production

## Questions?

Contact: [Your name/email]
