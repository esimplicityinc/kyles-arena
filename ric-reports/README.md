# RIC Reports

Weekly executive reports for the eSimplicity **Rapid Innovation Center (RIC)**.  
Live site: <https://esimplicityinc.github.io/kyles-arena/ric-reports/>

---

## What's in this folder

| Path | Purpose |
|---|---|
| `index.html` | Archive index page — lists all published reports |
| `reports/shared.css` | Shared design-system stylesheet used by every report |
| `reports/YYYY-MM-DD.html` | Individual weekly report files |
| `generate_report.py` | Python script that generates a new report from Jira data |

---

## How the automation works

1. **Every Monday at 9 AM ET** the GitHub Actions workflow `.github/workflows/weekly-report.yml` runs automatically.
2. It calls `generate_report.py`, which:
   - Connects to the Jira project `RIC` via the REST API.
   - Fetches all **Initiative** issue types with their status, priority, assignee, labels, and description.
   - Splits them into **Active**, **Queued**, and **Done (last 30 days)** categories.
   - Parses Sponsor, Need By Date, and Impact score from free-form description text.
   - Generates a fully-styled HTML report at `reports/YYYY-MM-DD.html` (dated to Monday of the current week).
   - Updates `index.html` to add the new report as the featured "Latest" entry and prepends it to the archive list.
3. The workflow commits and pushes the new files to `main`.
4. A GitHub Pages build is triggered in the same workflow run, deploying the updated site.

---

## Required GitHub Secrets

Two repository secrets must be set before the workflow can run:

| Secret name | Value |
|---|---|
| `JIRA_EMAIL` | The Atlassian account email used to authenticate (e.g. `you@esimplicity.com`) |
| `JIRA_API_TOKEN` | A personal Atlassian API token |

### Getting a Jira API token

1. Go to <https://id.atlassian.com/manage-profile/security/api-tokens>
2. Click **Create API token**.
3. Give it a label (e.g. `ric-report-bot`) and copy the generated token.

### Adding secrets to the GitHub repository

1. Navigate to the repository on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret** for each of the two secrets above.  
   Direct link: `https://github.com/esimplicityinc/kyles-arena/settings/secrets/actions`

---

## Manually triggering the workflow

You can generate a report at any time without waiting for Monday:

1. Go to the **Actions** tab in the GitHub repository.
2. Select **RIC Weekly Report – Generate & Deploy** from the left sidebar.
3. Click **Run workflow** → choose the `main` branch → click the green **Run workflow** button.

The workflow will run all three jobs (generate → build → deploy) and the live site will be updated within a few minutes.

---

## Local development / testing

```bash
# Install the only dependency
pip install requests

# Set environment variables
export JIRA_URL="https://esimplicity.atlassian.net"
export JIRA_EMAIL="you@esimplicity.com"
export JIRA_API_TOKEN="your-token-here"

# Run the generator (writes to ric-reports/reports/YYYY-MM-DD.html)
python ric-reports/generate_report.py
```

The script prints progress as it runs and outputs the path of the generated file at the end.

---

## Design system

All report pages share `reports/shared.css` — the eSimplicity design-system stylesheet.  
Do **not** edit CSS directly in individual report HTML files for structural changes; update `shared.css` instead so all reports stay consistent.
