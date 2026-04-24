# RIC Pulse - Plan Document

## 1. Project Overview

**RIC Pulse** is a Databricks App dashboard that tracks and showcases the Rapid Innovation Center's activity, impact, and value.

### Key Features
- **Consult Metrics**: Weekly BD vs Program consultation sessions pulled from Outlook Calendar
- **Jira Initiative Metrics**: Initiative counts by status and BU, cycle time, cumulative progress
- **CSAT & Impact**: Customer satisfaction scores and impact ratings from CSV upload
- **Testimonials Showcase**: Quotes from stakeholders highlighting RIC value

### Tech Stack
- **Framework**: Streamlit (Python)
- **Platform**: Databricks Apps
- **APIs**: Microsoft Graph (Outlook), Jira REST API
- **Storage**: Delta tables (for caching metrics data)
- **Styling**: eSimplicity purple theme (#3223BD)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RIC Pulse Dashboard                       │
│                      (Databricks App / Streamlit)                │
└─────────────────────────────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Outlook Calendar │    │   Jira API      │    │   CSV Upload    │
│ (Graph API)      │    │   (RIC Project) │    │   (CSAT Data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                      ┌─────────────────────┐
                      │   Delta Tables      │
                      │   (Cached Metrics)  │
                      └─────────────────────┘
```

### Data Flow
1. **Outlook Calendar** → Microsoft Graph API → Filter by category ("growth", "program") → Aggregate by week → Store in Delta table
2. **Jira** → Jira REST API → Fetch RIC initiatives → Calculate metrics → Store in Delta table
3. **CSAT CSV** → Upload via UI → Parse and store in Delta table
4. **Dashboard** → Read from Delta tables → Display charts and metrics

---

## 3. Databricks App Deployment Guide

### Prerequisites
- Databricks workspace with Apps enabled
- Databricks CLI installed and configured
- Python 3.10+
- Access to Microsoft Graph API (for Outlook)
- Jira API token

### Local Development Setup

```bash
# Clone the repo and navigate to project
cd ric-pulse

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run locally
streamlit run app.py
```

### Deploy to Databricks

```bash
# 1. Create the app in Databricks UI (Apps → Create App → Blank template)
# 2. Name it "ric-pulse"
# 3. Export and sync:
databricks workspace export-dir /Workspace/Users/<your-email>/databricks_apps/ric-pulse .

# 4. Deploy
databricks apps deploy ric-pulse --source-code-path /Workspace/Users/<your-email>/databricks_apps/ric-pulse
```

### App Configuration (app.yaml)

```yaml
command:
  - streamlit
  - run
  - app.py
  - --server.port
  - "8000"
  - --server.address
  - "0.0.0.0"

env:
  - name: JIRA_API_TOKEN
    valueFrom: secret/ric-pulse/jira-token
  - name: MS_GRAPH_CLIENT_ID
    valueFrom: secret/ric-pulse/graph-client-id
  - name: MS_GRAPH_CLIENT_SECRET
    valueFrom: secret/ric-pulse/graph-client-secret
```

---

## 4. Features & Implementation Phases

### Phase 1: Foundation
- [ ] Create project structure (app.py, app.yaml, requirements.txt)
- [ ] Set up Streamlit app with eSimplicity styling
- [ ] Build basic dashboard layout (4 sections)
- [ ] Implement CSV upload for CSAT data
- [ ] Display testimonials from uploaded data

### Phase 2: Jira Integration
- [ ] Set up Jira API client
- [ ] Pull all RIC initiatives
- [ ] Calculate metrics:
  - Count by status (Discovery, In Progress, Done, etc.)
  - Count by Business Unit (Health, Civilian, Defense, Intelligence)
  - Cycle time (avg days in each status)
  - Cumulative items over time
- [ ] Display metrics with charts

### Phase 3: Outlook Calendar Integration
- [ ] Set up Microsoft Graph API authentication (OAuth)
- [ ] Pull calendar events from last 3 months
- [ ] Filter by category:
  - "growth" → BD sessions
  - "program" → Program sessions
- [ ] Aggregate by week
- [ ] Display trends chart

### Phase 4: Polish & Automation
- [ ] Add scheduled job for daily data refresh
- [ ] Refine charts and styling
- [ ] Add date range filters
- [ ] Error handling and loading states
- [ ] Deploy to production

---

## 5. Data Models

### CSAT Data (CSV Upload)

| Column | Type | Description |
|--------|------|-------------|
| Initiative | string | Name of the RIC initiative |
| Stakeholder | string | Person providing feedback |
| Date | date | Date of feedback |
| CSAT (1-5) | integer | Satisfaction score |
| Impact Rating | string | High / Medium / Low |
| Category | string | Program / BD |
| Testimonial | string | Quote from stakeholder |

### Consult Sessions (from Outlook)

| Column | Type | Description |
|--------|------|-------------|
| week_start | date | Start of the week |
| week_end | date | End of the week |
| bd_sessions | integer | Count of BD/Growth consults |
| program_sessions | integer | Count of Program consults |
| total | integer | Weekly total |
| cumulative | integer | Running cumulative total |

### Initiative Metrics (from Jira)

| Column | Type | Description |
|--------|------|-------------|
| snapshot_date | date | Date metrics were captured |
| status | string | Initiative status |
| count | integer | Number of initiatives |
| business_unit | string | BU (Health, Civilian, etc.) |
| avg_cycle_time_days | float | Average days in status |

---

## 6. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  RIC Pulse                                    [Last updated: X] │
│  ─────────────────────────────────────────────────────────────  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │  CONSULT SESSIONS       │  │  CSAT SCORE                 │  │
│  │  ───────────────────    │  │  ─────────────              │  │
│  │  BD: 4  |  Program: 3   │  │       4.8 / 5               │  │
│  │  This Week: 7           │  │  ████████████░░  (96%)      │  │
│  │  Cumulative: 51         │  │                             │  │
│  │                         │  │  Responses: 12              │  │
│  │  [Trend Chart]          │  │  [Trend Chart]              │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  JIRA INITIATIVES                                         │  │
│  │  ────────────────────────────────────────────────────     │  │
│  │                                                           │  │
│  │  By Status              By Business Unit                  │  │
│  │  ┌─────────────────┐    ┌─────────────────┐              │  │
│  │  │ Discovery: 5    │    │ Health: 8       │              │  │
│  │  │ In Progress: 8  │    │ Civilian: 4     │              │  │
│  │  │ Done: 12        │    │ Defense: 6      │              │  │
│  │  │ Blocked: 1      │    │ Intelligence: 2 │              │  │
│  │  └─────────────────┘    └─────────────────┘              │  │
│  │                                                           │  │
│  │  Avg Cycle Time: 14 days                                  │  │
│  │                                                           │  │
│  │  [Cumulative Progress Chart Over Time]                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TESTIMONIALS                                             │  │
│  │  ────────────────────────────────────────────────────     │  │
│  │                                                           │  │
│  │  "Our Program team faced a challenge... The result is     │  │
│  │   much faster generation of test data to support our      │  │
│  │   agile development. The productivity improvement is      │  │
│  │   at least 100%+!"                                        │  │
│  │                                                           │  │
│  │   — Raymond Ling, T-MSIS (Mar 23, 2026)                   │  │
│  │   Impact: High | CSAT: 5/5                                │  │
│  │                                                           │  │
│  │  [More testimonials...]                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Color Palette (eSimplicity)
- Primary: `#3223BD` (Twilight purple)
- Light purple: `#D9DCF8`
- Very light purple: `#EEEDFE`
- Black text: `#1C1C1C`
- Dark gray: `#444441`
- Success green: `#085041`
- Background: `#FFFFFF`

---

## 7. BDD Scenarios

### Feature: Consult Session Metrics

```gherkin
Feature: View consultation session metrics
  As a RIC leader
  I want to see BD and Program consultation counts
  So that I can track engagement and report to leadership

  Scenario: View current week's consultation counts
    Given I am on the RIC Pulse dashboard
    When the page loads
    Then I should see BD consultation count for the current week
    And I should see Program consultation count for the current week
    And I should see the weekly total
    And I should see the cumulative total

  Scenario: View consultation trends over time
    Given I am on the RIC Pulse dashboard
    When I view the consult metrics section
    Then I should see a chart showing BD vs Program sessions by week
    And the chart should show the last 3 months of data
```

### Feature: Jira Initiative Metrics

```gherkin
Feature: View Jira initiative metrics
  As a RIC leader
  I want to see initiative counts and progress from Jira
  So that I can track RIC portfolio health

  Scenario: View initiatives by status
    Given I am on the RIC Pulse dashboard
    When I view the Jira initiatives section
    Then I should see count of initiatives in Discovery
    And I should see count of initiatives In Progress
    And I should see count of initiatives Done
    And I should see count of initiatives in other statuses

  Scenario: View initiatives by business unit
    Given I am on the RIC Pulse dashboard
    When I view the Jira initiatives section
    Then I should see count of initiatives for Health
    And I should see count of initiatives for Civilian
    And I should see count of initiatives for Defense
    And I should see count of initiatives for Intelligence

  Scenario: View cumulative progress over time
    Given I am on the RIC Pulse dashboard
    When I view the progress chart
    Then I should see a stacked area chart showing initiatives by status over time
```

### Feature: CSAT and Testimonials

```gherkin
Feature: View CSAT scores and testimonials
  As a RIC leader
  I want to see customer satisfaction and testimonials
  So that I can showcase the value RIC provides

  Scenario: View current CSAT score
    Given CSAT data has been uploaded
    When I view the CSAT section
    Then I should see the average CSAT score
    And I should see the number of responses
    And I should see a trend chart over time

  Scenario: View testimonials
    Given CSAT data with testimonials has been uploaded
    When I view the testimonials section
    Then I should see testimonial quotes
    And each testimonial should show the stakeholder name
    And each testimonial should show the initiative name
    And each testimonial should show the date and impact rating

  Scenario: Upload CSAT data
    Given I am on the data management page
    When I upload a CSV file with CSAT data
    Then the dashboard should display the new CSAT metrics
    And the testimonials section should update
```

### Feature: Data Refresh

```gherkin
Feature: Refresh data from sources
  As a RIC leader
  I want data to be refreshed automatically
  So that I always see current metrics

  Scenario: Manual data refresh
    Given I am on the RIC Pulse dashboard
    When I click the refresh button
    Then the app should fetch latest data from Outlook
    And the app should fetch latest data from Jira
    And the dashboard should update with new data

  Scenario: Scheduled data refresh
    Given the scheduled refresh job is configured
    When the job runs daily at 6 AM
    Then Outlook calendar data should be refreshed
    And Jira initiative data should be refreshed
```

---

## 8. File Structure

```
ric-pulse/
├── PLAN.md                 # This document
├── app.py                  # Main Streamlit application
├── app.yaml                # Databricks App configuration
├── requirements.txt        # Python dependencies
├── src/
│   ├── __init__.py
│   ├── outlook.py          # Microsoft Graph API client
│   ├── jira_client.py      # Jira API client
│   ├── data_models.py      # Data classes and schemas
│   └── charts.py           # Chart generation utilities
├── styles/
│   └── theme.py            # eSimplicity color theme
└── data/
    └── sample_csat.csv     # Sample CSAT data for testing
```

---

## 9. Dependencies (requirements.txt)

```
streamlit>=1.32.0
pandas>=2.0.0
plotly>=5.18.0
requests>=2.31.0
msal>=1.26.0
jira>=3.5.0
python-dotenv>=1.0.0
databricks-sdk>=0.20.0
```

---

## 10. Open Questions / Decisions

1. **Outlook Auth**: Need to set up an Azure AD app registration for Microsoft Graph API access. Do you have access to Azure AD, or should we request this?

2. **Jira Auth**: We'll need a Jira API token. Should we use your personal token or create a service account?

3. **Data Retention**: How long should we keep historical metrics in Delta tables? (Suggested: 1 year rolling)

4. **Refresh Frequency**: Daily refresh okay, or do you need more frequent updates?

5. **Access Control**: Who should be able to view this dashboard? Just you? Leadership? All of RIC?

---

## 11. Execution Plan

When ready to build, create the following files in order:

### Step 1: Project Setup
1. Create `ric-pulse/` directory structure
2. Create `requirements.txt`
3. Create `app.yaml` (Databricks config)
4. Create `styles/theme.py` (color constants)

### Step 2: Basic App
1. Create `app.py` with:
   - Page config and styling
   - Dashboard layout (4 sections as placeholders)
   - CSV upload widget for CSAT data
   - Testimonials display

### Step 3: Sample Data
1. Create `data/sample_csat.csv` with example data

### Step 4: Test Locally
```bash
cd ric-pulse
pip install -r requirements.txt
streamlit run app.py
```

### Step 5: Add Jira Integration
1. Create `src/jira_client.py`
2. Integrate with dashboard

### Step 6: Add Outlook Integration
1. Create `src/outlook.py`
2. Integrate with dashboard

### Step 7: Deploy to Databricks
1. Follow deployment guide in Section 3
