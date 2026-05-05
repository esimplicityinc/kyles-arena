#!/usr/bin/env python3
"""
RIC Weekly Report Generator
============================
Fetches all RIC Initiative issues from Jira and generates a complete
HTML report file matching the eSimplicity design system in shared.css.

Usage:
    python ric-reports/generate_report.py

Required environment variables:
    JIRA_URL        – e.g. https://esimplicity.atlassian.net
    JIRA_EMAIL      – Atlassian account email
    JIRA_API_TOKEN  – Atlassian API token
"""

import os
import re
import sys
import json
import math
import datetime
import requests
from requests.auth import HTTPBasicAuth
from html import escape


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

JIRA_URL   = os.environ.get("JIRA_URL",   "").rstrip("/")
JIRA_EMAIL = os.environ.get("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.environ.get("JIRA_API_TOKEN", "")

PROJECT_KEY = "RIC"
BOARD_URL   = "https://esimplicity.atlassian.net/jira/software/projects/RIC/boards/918"

ACTIVE_STATUSES        = {"In Progress", "Blocked", "Always On", "Reviewing"}
READY_FOR_WORK_STATUSES = {"Ready for Work"}
QUEUED_STATUSES        = {"To Do"}
DONE_STATUSES          = {"Done"}
DONE_LOOKBACK_DAYS = 30

PRIORITY_ORDER = {
    "Blocker":  1,
    "Critical": 2,
    "High":     3,
    "Medium":   4,
    "Low":      5,
}

# ---------------------------------------------------------------------------
# Jira REST API helpers
# ---------------------------------------------------------------------------

def jira_auth():
    return HTTPBasicAuth(JIRA_EMAIL, JIRA_API_TOKEN)


def jira_get(path, params=None):
    url = f"{JIRA_URL}/rest/api/3/{path.lstrip('/')}"
    resp = requests.get(url, auth=jira_auth(), params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_all_initiatives():
    """
    Paginate through all RIC issues of type Initiative.
    Returns a list of raw Jira issue dicts.
    """
    issues = []
    start_at = 0
    page_size = 50
    fields = (
        "summary,status,priority,assignee,description,labels,"
        "project,updated,created,issuetype"
    )
    jql = f'project = {PROJECT_KEY} AND issuetype = Initiative ORDER BY updated DESC'

    while True:
        print(f"  Fetching issues {start_at}–{start_at + page_size - 1} …")
        data = jira_get("search", params={
            "jql":      jql,
            "fields":   fields,
            "startAt":  start_at,
            "maxResults": page_size,
        })
        batch = data.get("issues", [])
        issues.extend(batch)
        total = data.get("total", 0)
        start_at += len(batch)
        if start_at >= total or not batch:
            break

    print(f"  Fetched {len(issues)} initiative(s) total.")
    return issues


# ---------------------------------------------------------------------------
# Data parsing helpers
# ---------------------------------------------------------------------------

def get_text(field, default="—"):
    """Safely extract string value."""
    if field is None:
        return default
    if isinstance(field, str):
        return field.strip() or default
    if isinstance(field, dict):
        return (field.get("displayName") or field.get("name") or field.get("value") or "").strip() or default
    return str(field).strip() or default


def extract_description_text(description_field):
    """
    Jira Cloud returns description as Atlassian Document Format (ADF).
    Walk the content tree and extract plain text.
    """
    if description_field is None:
        return ""
    if isinstance(description_field, str):
        return description_field

    def walk(node):
        if node is None:
            return ""
        node_type = node.get("type", "")
        text = node.get("text", "")
        parts = []
        if text:
            parts.append(text)
        for child in node.get("content", []):
            parts.append(walk(child))
        # Add newlines after block-level nodes
        if node_type in ("paragraph", "heading", "bulletList", "orderedList",
                          "listItem", "blockquote", "codeBlock", "rule"):
            return "\n".join(parts) + "\n"
        return "".join(parts)

    return walk(description_field).strip()


def parse_sponsor(desc_text):
    """Extract Sponsor from freeform description text."""
    patterns = [
        r"(?i)sponsor[:\s]+([^\n\r|]+)",
        r"(?i)sponsored\s+by[:\s]+([^\n\r|]+)",
    ]
    for pat in patterns:
        m = re.search(pat, desc_text)
        if m:
            val = m.group(1).strip().rstrip(".,;")
            if val:
                return val
    return None


def parse_need_by_date(desc_text):
    """Extract Need By Date from freeform description text."""
    patterns = [
        r"(?i)need\s*by\s*date[:\s]+([^\n\r|]+)",
        r"(?i)needbydate[:\s]+([^\n\r|]+)",
        r"(?i)need\s*by[:\s]+([^\n\r|]+)",
        r"(?i)requested\s+by[:\s]+([^\n\r|]+)",
        r"(?i)due\s*date[:\s]+([^\n\r|]+)",
        r"(?i)due[:\s]+([^\n\r|]+)",
    ]
    for pat in patterns:
        m = re.search(pat, desc_text)
        if m:
            val = m.group(1).strip().rstrip(".,;")
            if val:
                return val
    return None


def parse_impact(desc_text):
    """Extract Impact score from freeform description text."""
    patterns = [
        r"(?i)impact[:\s]+(\d+(?:\.\d+)?(?:\s*/\s*\d+)?)",
        r"(?i)impact\s+score[:\s]+(\d+(?:\.\d+)?(?:\s*/\s*\d+)?)",
    ]
    for pat in patterns:
        m = re.search(pat, desc_text)
        if m:
            val = m.group(1).strip()
            if val:
                return val
    return None


def parse_need_by_date_obj(date_str):
    """
    Try to parse a date string into a datetime.date object.
    Returns None if parsing fails.
    """
    if not date_str or date_str in ("—", "TBD", "Ongoing", "N/A"):
        return None
    # Try common patterns
    formats = [
        "%B %d, %Y",   # May 1, 2026
        "%b %d, %Y",   # May 1, 2026 (abbrev month)
        "%Y-%m-%d",    # 2026-05-01
        "%m/%d/%Y",    # 05/01/2026
        "%m/%d/%y",    # 05/01/26
        "%d/%m/%Y",    # 01/05/2026
        "%B %Y",       # May 2026
        "%b %Y",       # May 2026
    ]
    # Clean up the string a bit
    cleaned = date_str.strip().split("\n")[0].strip()
    # Remove ordinal suffixes: 1st, 2nd, 3rd, 4th…
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned, flags=re.IGNORECASE)
    for fmt in formats:
        try:
            return datetime.datetime.strptime(cleaned, fmt).date()
        except ValueError:
            pass
    return None


def get_category_tags(labels):
    """
    Given a list of label strings, return a list of (tag_key, display_name) tuples.
    tag_key is used for CSS class: bd, program, corp
    """
    tags = []
    seen = set()
    for lbl in (labels or []):
        lbl_lower = lbl.lower()
        if "bd" in lbl_lower or "growth" in lbl_lower or "bd/growth" in lbl_lower:
            if "bd" not in seen:
                tags.append(("bd", "BD / Growth"))
                seen.add("bd")
        if "program" in lbl_lower:
            if "program" not in seen:
                tags.append(("program", "Program"))
                seen.add("program")
        if "corporate" in lbl_lower or "internal" in lbl_lower or "corp" in lbl_lower:
            if "corp" not in seen:
                tags.append(("corp", "Corporate / Internal"))
                seen.add("corp")
    return tags


def get_status_badge_class(status_name):
    """Map Jira status name to CSS badge class."""
    mapping = {
        "In Progress":    "badge--in-progress",
        "Blocked":        "badge--blocked",
        "Ready for Work": "badge--ready",
        "Always On":      "badge--always-on",
        "Reviewing":      "badge--in-progress",
        "To Do":          "badge--ready",
        "Done":           "badge--done",
    }
    return mapping.get(status_name, "badge--ready")


def get_status_label(status_name):
    """Map Jira status name to display label."""
    mapping = {
        "In Progress":    "In Progress",
        "Blocked":        "⛔ Blocked",
        "Ready for Work": "Ready for Work",
        "Always On":      "🔵 Always On",
        "Reviewing":      "Reviewing",
        "To Do":          "Queued",
        "Done":           "Done",
    }
    return mapping.get(status_name, status_name)


def get_priority_badge_class(priority_name):
    """Map Jira priority to CSS badge class."""
    mapping = {
        "Blocker":  "badge--blocker",
        "Critical": "badge--critical",
        "High":     "badge--high",
        "Medium":   "badge--medium",
        "Low":      "badge--medium",
    }
    return mapping.get(priority_name, "badge--medium")


def get_priority_label(priority_name):
    """Return display label with emoji for priority."""
    mapping = {
        "Blocker":  "🔴 Blocker",
        "Critical": "🔴 Critical",
        "High":     "🟠 High",
        "Medium":   "🟡 Medium",
        "Low":      "🟢 Low",
    }
    return mapping.get(priority_name, priority_name or "")


def priority_sort_key(issue):
    """Returns numeric sort key for priority (lower = higher priority)."""
    pname = get_text(issue.get("fields", {}).get("priority"), "")
    return PRIORITY_ORDER.get(pname, 6)


def get_quarter(date_obj):
    """Return quarter string like 'Q2 2026' for a given date."""
    q = math.ceil(date_obj.month / 3)
    return f"Q{q} {date_obj.year}"


# ---------------------------------------------------------------------------
# Issue categorization
# ---------------------------------------------------------------------------

def categorize_issues(issues):
    """Split issues into in_progress, ready_for_work, queued, and done lists."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=DONE_LOOKBACK_DAYS)
    in_progress    = []
    ready_for_work = []
    queued         = []
    done           = []

    for issue in issues:
        fields = issue.get("fields", {})
        status_name = get_text(fields.get("status"), "")

        if status_name in ACTIVE_STATUSES:
            in_progress.append(issue)
        elif status_name in READY_FOR_WORK_STATUSES:
            ready_for_work.append(issue)
        elif status_name in QUEUED_STATUSES:
            queued.append(issue)
        elif status_name in DONE_STATUSES:
            # Only include if updated within lookback window
            updated_str = fields.get("updated") or ""
            if updated_str:
                try:
                    updated_dt = datetime.datetime.fromisoformat(
                        updated_str.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                    if updated_dt >= cutoff:
                        done.append(issue)
                except (ValueError, AttributeError):
                    done.append(issue)
            else:
                done.append(issue)

    # Sort in_progress by priority
    in_progress.sort(key=priority_sort_key)

    return in_progress, ready_for_work, queued, done


# ---------------------------------------------------------------------------
# HTML generation helpers
# ---------------------------------------------------------------------------

def h(text):
    """HTML-escape a string. Handles None gracefully."""
    if text is None:
        return ""
    return escape(str(text))


def render_category_badges(labels):
    """Render category badge pills HTML."""
    tags = get_category_tags(labels)
    if not tags:
        return ""
    parts = []
    for key, display in tags:
        parts.append(f'<span class="badge badge--{h(key)}">{h(display)}</span>')
    return "\n".join(parts)


def render_priority_badge(priority_name):
    """Render priority badge HTML."""
    if not priority_name:
        return ""
    css = get_priority_badge_class(priority_name)
    label = get_priority_label(priority_name)
    return f'<span class="badge {h(css)}">{h(label)}</span>'


def render_status_badge(status_name):
    """Render status badge HTML."""
    css = get_status_badge_class(status_name)
    label = get_status_label(status_name)
    return f'<span class="badge {h(css)}">{h(label)}</span>'


def is_past_due(need_by_str):
    """Returns True if need_by_str represents a date in the past."""
    d = parse_need_by_date_obj(need_by_str)
    if d is None:
        return False
    return d < datetime.date.today()


def render_active_card(issue, idx):
    """Render a single active initiative card."""
    fields       = issue.get("fields", {})
    summary      = h(get_text(fields.get("summary"), "Untitled Initiative"))
    status_name  = get_text(fields.get("status"), "")
    priority_name = get_text(fields.get("priority"), "")
    assignee     = get_text(fields.get("assignee"), None)
    labels       = fields.get("labels") or []
    desc_field   = fields.get("description")
    issue_key    = h(issue.get("key", ""))

    desc_text = extract_description_text(desc_field)
    sponsor   = parse_sponsor(desc_text)
    need_by   = parse_need_by_date(desc_text)
    impact    = parse_impact(desc_text)

    # Trim description for the card body (first 3 meaningful lines or 500 chars)
    desc_lines = [ln.strip() for ln in desc_text.splitlines() if ln.strip()]
    # Skip lines that look like metadata fields we've already parsed
    meta_patterns = re.compile(
        r"(?i)^(sponsor|need\s*by|due|impact|requested\s*by|needbydate)[:\s]"
    )
    body_lines = [ln for ln in desc_lines if not meta_patterns.match(ln)]
    body_text = " ".join(body_lines[:4]) if body_lines else ""
    if len(body_text) > 600:
        body_text = body_text[:597] + "…"

    is_blocked = (status_name == "Blocked")
    past_due   = is_past_due(need_by) if need_by else False

    card_classes = "initiative-card"
    if is_blocked:
        card_classes += " initiative-card--blocked"
    elif past_due:
        card_classes += " initiative-card--pastdue"

    # Build badge row
    badge_parts = []
    if priority_name:
        badge_parts.append(render_priority_badge(priority_name))
    badge_parts.append(render_category_badges(labels))
    badge_parts.append(render_status_badge(status_name))
    if is_blocked:
        badge_parts.append('<span class="blocked-alert">⛔ BLOCKED</span>')
    if past_due:
        badge_parts.append('<span class="pastdue-alert">⚠️ Past Due</span>')

    badges_html = "\n                ".join(b for b in badge_parts if b)

    # Meta row
    meta_parts = []
    if assignee:
        meta_parts.append(f'<span class="initiative-card__meta-item"><strong>Owner</strong> {h(assignee)}</span>')
    if sponsor:
        meta_parts.append(f'<span class="initiative-card__meta-item"><strong>Sponsor</strong> {h(sponsor)}</span>')
    if need_by:
        meta_parts.append(f'<span class="initiative-card__meta-item"><strong>Due</strong> {h(need_by)}</span>')
    if impact:
        meta_parts.append(f'<span class="initiative-card__meta-item"><strong>Impact</strong> {h(impact)}</span>')

    meta_html = "\n              ".join(meta_parts) if meta_parts else ""

    # Update / body section
    if is_blocked:
        update_class = "initiative-card__update initiative-card__update--blocked"
        update_inner = f"<strong>⛔ BLOCKED:</strong> This initiative is currently blocked. Intervention may be required to unblock progress."
    else:
        update_class = "initiative-card__update"
        update_inner = f"<strong>Status:</strong> {h(status_name)}." + (
            f" Issue: <a href='{JIRA_URL}/browse/{issue_key}' target='_blank' rel='noopener noreferrer'>{issue_key}</a>"
            if issue_key else ""
        )

    body_section = ""
    if body_text:
        body_section = f"""
            <p class="initiative-card__body">
              {h(body_text)}
            </p>"""

    return f"""
          <!-- {h(issue_key)}: {summary} -->
          <article class="{card_classes}" aria-labelledby="init-{idx}-title">
            <div class="initiative-card__header">
              <span class="initiative-num" aria-hidden="true">{idx}</span>
              <div class="initiative-card__badges">
                {badges_html}
              </div>
            </div>
            <h3 class="initiative-card__title" id="init-{idx}-title">{summary}</h3>
            {"<div class='initiative-card__meta'>" + meta_html + "</div>" if meta_html else ""}
            {body_section}
            <div class="{update_class}">
              {update_inner}
            </div>
          </article>"""


def render_queued_row(issue):
    """Render a single row in the queued table."""
    fields        = issue.get("fields", {})
    summary       = h(get_text(fields.get("summary"), "Untitled"))
    labels        = fields.get("labels") or []
    desc_field    = fields.get("description")
    desc_text     = extract_description_text(desc_field)
    sponsor       = parse_sponsor(desc_text)
    need_by       = parse_need_by_date(desc_text)
    impact        = parse_impact(desc_text)
    issue_key     = h(issue.get("key", ""))

    tags       = get_category_tags(labels)
    cat_badges = " ".join(
        f'<span class="badge badge--{h(k)}">{h(d)}</span>' for k, d in tags
    ) if tags else "—"

    sponsor_cell = h(sponsor) if sponsor else "—"

    if need_by:
        past = is_past_due(need_by)
        need_by_cell = f'<span class="warn">{h(need_by)} ⚠️</span>' if past else h(need_by)
    else:
        need_by_cell = "—"

    impact_cell = h(impact) if impact else "—"

    return f"""
              <tr>
                <td><strong><a href="{JIRA_URL}/browse/{issue_key}" target="_blank" rel="noopener noreferrer">{summary}</a></strong></td>
                <td>{cat_badges}</td>
                <td>{sponsor_cell}</td>
                <td>{need_by_cell}</td>
                <td>{impact_cell}</td>
              </tr>"""


def render_done_row(issue):
    """Render a single row in the done/completed table."""
    fields     = issue.get("fields", {})
    summary    = h(get_text(fields.get("summary"), "Untitled"))
    labels     = fields.get("labels") or []
    desc_field = fields.get("description")
    desc_text  = extract_description_text(desc_field)
    issue_key  = h(issue.get("key", ""))

    tags       = get_category_tags(labels)
    cat_badges = " ".join(
        f'<span class="badge badge--{h(k)}">{h(d)}</span>' for k, d in tags
    ) if tags else "—"

    # Try to extract a short outcome note from description
    outcome_lines = [ln.strip() for ln in desc_text.splitlines() if ln.strip()]
    outcome = outcome_lines[-1][:120] if outcome_lines else ""
    outcome_html = f'<span class="done-cell">✅ {h(outcome)}</span>' if outcome else '<span class="done-cell">✅ Completed</span>'

    return f"""
              <tr>
                <td><strong><a href="{JIRA_URL}/browse/{issue_key}" target="_blank" rel="noopener noreferrer">{summary}</a></strong></td>
                <td>{cat_badges}</td>
                <td>{outcome_html}</td>
              </tr>"""


def has_past_due_queued(queued_issues):
    """Return True if any queued issue has a past-due Need By date."""
    for issue in queued_issues:
        fields     = issue.get("fields", {})
        desc_field = fields.get("description")
        desc_text  = extract_description_text(desc_field)
        need_by    = parse_need_by_date(desc_text)
        if need_by and is_past_due(need_by):
            return True
    return False


# ---------------------------------------------------------------------------
# Full HTML document generator
# ---------------------------------------------------------------------------

def generate_html(active, ready_for_work, queued, done, report_date, week_date_str, quarter_str):
    """Build and return the complete HTML report string."""
    today_str = report_date.strftime("%B %-d, %Y")
    year_str  = str(report_date.year)

    n_active        = len(active)
    n_ready_for_work = len(ready_for_work)
    n_queued        = len(queued)
    n_done          = len(done)
    n_blocked = sum(
        1 for i in active
        if get_text(i.get("fields", {}).get("status"), "") == "Blocked"
    )

    # Active (In Progress) cards
    active_cards_html = "\n".join(
        render_active_card(issue, idx + 1)
        for idx, issue in enumerate(active)
    )

    # Ready for Work cards
    rfw_cards_html = "\n".join(
        render_active_card(issue, idx + 1)
        for idx, issue in enumerate(ready_for_work)
    )

    # Queued rows
    queued_rows_html = "\n".join(render_queued_row(i) for i in queued)
    queued_has_pastdue = has_past_due_queued(queued)
    queued_note_html = ""
    if queued_has_pastdue:
        queued_note_html = """
        <div class="table-note">
          ⚠️ Items marked with ⚠️ have passed their requested delivery date. A queue review is recommended to reset expectations with sponsors and ensure alignment.
        </div>"""

    # Done rows
    done_rows_html = "\n".join(render_done_row(i) for i in done)

    # Empty state placeholders
    if not active:
        active_cards_html = '<p style="color:var(--color-gray-500);padding:var(--space-6) 0;">No active initiatives this week.</p>'
    if not ready_for_work:
        rfw_cards_html = '<p style="color:var(--color-gray-500);padding:var(--space-6) 0;">No initiatives currently ready for work.</p>'
    if not queued:
        queued_rows_html = '<tr><td colspan="5" style="color:var(--color-gray-500);text-align:center;padding:var(--space-6);">No queued initiatives.</td></tr>'
    if not done:
        done_rows_html = '<tr><td colspan="3" style="color:var(--color-gray-500);text-align:center;padding:var(--space-6);">No completed initiatives this cycle.</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="RIC Weekly Executive Report – Week of {h(week_date_str)}. Status of all active RIC initiatives, queued work, and recently completed deliverables." />
  <title>RIC Weekly Report | {h(week_date_str)}</title>
  <link rel="stylesheet" href="shared.css" />
  <style>
    /* Report-page-only styles */

    /* Capacity banner strip */
    .capacity-banner {{
      background: var(--color-warning-bg);
      border: 2px solid var(--color-warning-border);
      border-radius: var(--radius-xl);
      padding: var(--space-5) var(--space-6);
      display: flex;
      gap: var(--space-4);
      align-items: flex-start;
      margin-top: var(--space-8);
    }}
    .capacity-banner__icon {{
      font-size: 1.5rem;
      flex-shrink: 0;
      line-height: 1.4;
    }}
    .capacity-banner__body {{}}
    .capacity-banner__title {{
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--color-warning-text);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: var(--space-2);
    }}
    .capacity-banner__text {{
      font-size: 0.9rem;
      color: var(--color-warning-text);
      line-height: 1.65;
    }}

    /* Board card */
    .board-section {{
      margin-top: var(--space-8);
    }}

    /* Number badge on initiative */
    .initiative-num {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: var(--color-gray-100);
      color: var(--color-gray-500);
      font-size: 0.7rem;
      font-weight: 800;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: var(--space-1);
    }}

    /* Blocked alert within card */
    .blocked-alert {{
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-blocked);
      background: var(--color-blocked-bg);
      border: 1px solid var(--color-blocked-border);
      border-radius: var(--radius-full);
      padding: 3px 10px;
    }}

    /* Past due indicator */
    .pastdue-alert {{
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-medium);
      background: var(--color-medium-bg);
      border: 1px solid var(--color-medium-border);
      border-radius: var(--radius-full);
      padding: 3px 10px;
    }}

    /* Done badge in table */
    .done-cell {{
      color: var(--color-done);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }}

    /* Column status pills inside board card */
    .status-pill {{
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: var(--radius-full);
      background: var(--color-gray-100);
      color: var(--color-gray-700);
      border: 1px solid var(--color-gray-200);
    }}
    .status-pill--new {{
      background: var(--color-primary);
      color: var(--color-white);
      border-color: var(--color-primary);
    }}

    /* Section intro text (used under Ready for Work heading) */
    .section__intro {{
      color: var(--color-gray-500);
      font-size: 0.9rem;
      margin-top: calc(-1 * var(--space-4));
      margin-bottom: var(--space-6);
    }}

    /* Print tweaks */
    @media print {{
      .initiative-card {{ page-break-inside: avoid; }}
      .section {{ page-break-before: auto; }}
    }}
  </style>
</head>
<body>

  <!-- Sticky Navigation -->
  <nav class="site-nav" role="navigation" aria-label="Report navigation">
    <div class="site-nav__inner">
      <a href="../index.html" class="site-nav__back" aria-label="Back to all reports">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        All Reports
      </a>
      <div class="site-nav__brand">
        <span class="site-nav__badge" aria-hidden="true">RIC</span>
        <span class="site-nav__title">Weekly Report &nbsp;·&nbsp; {h(week_date_str)}</span>
      </div>
    </div>
  </nav>

  <!-- Report Hero -->
  <header class="report-hero" role="banner">
    <div class="report-hero__inner">
      <p class="report-hero__eyebrow">eSimplicity &nbsp;·&nbsp; Rapid Innovation Center</p>
      <h1 class="report-hero__title">RIC Weekly Executive Report</h1>
      <p class="report-hero__date">Week of {h(week_date_str)} &nbsp;·&nbsp; {h(quarter_str)}</p>
    </div>
  </header>

  <!-- Main -->
  <main>
    <div class="page-container">

      <!-- ================================================================
           CAPACITY NOTICE
           ================================================================ -->
      <div class="capacity-banner" role="alert" aria-live="polite">
        <span class="capacity-banner__icon" aria-hidden="true">⚠️</span>
        <div class="capacity-banner__body">
          <div class="capacity-banner__title">Capacity Notice — Full Capacity</div>
          <p class="capacity-banner__text">
            The RIC team is currently operating at full capacity. All active resources are committed to the initiatives below.
            Any new requests entering the pipeline will need to be weighed against existing commitments — something will need
            to move to make room. We are being transparent upfront so leadership can make informed prioritization decisions
            before new work is assigned.
          </p>
        </div>
      </div>

      <!-- ================================================================
           BOARD ACCESS
           ================================================================ -->
      <section class="board-section" aria-labelledby="board-heading">
        <div class="board-card">
          <div>
            <h2 class="board-card__title" id="board-heading">📊 Improved Board Visibility — Now Available to You</h2>
            <p class="board-card__desc">
              We've made meaningful updates to how we track and display RIC initiative work. The board is now easy to scan by initiative category:
            </p>
            <div class="board-card__legend">
              <div class="board-card__legend-item">🏢 <strong>BD / Growth</strong> — opportunities supporting business development and capture efforts</div>
              <div class="board-card__legend-item">💼 <strong>Program</strong> — innovation work happening directly on existing contracts</div>
              <div class="board-card__legend-item">🏛️ <strong>Corporate / Internal</strong> — improvements benefiting eSimplicity operations and staff</div>
            </div>
            <div class="board-card__columns">
              <div class="board-card__columns-title">Status columns</div>
              <div class="board-card__col-list">
                <span class="status-pill status-pill--new">Ready for Work</span>
                <span class="status-pill status-pill--new">Always On</span>
                <span class="status-pill status-pill--new">Blocked</span>
                <span class="status-pill status-pill--new">Reviewing</span>
              </div>
            </div>
          </div>
          <div>
            <a
              href="{BOARD_URL}"
              target="_blank"
              rel="noopener noreferrer"
              class="board-card__link-btn"
              aria-label="Open Customer Initiatives Board in Jira (opens in new tab)"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Customer Initiatives Board → View Live</span>
            </a>
          </div>
        </div>
      </section>

      <!-- ================================================================
           IN PROGRESS
           ================================================================ -->
      <section class="section" aria-labelledby="active-heading">
        <div class="section__header">
          <h2 class="section__title" id="active-heading">In Progress</h2>
          <span class="section__count">{n_active}</span>
        </div>

        <div class="initiative-grid">
          {active_cards_html}
        </div><!-- /.initiative-grid -->
      </section>

      <!-- ================================================================
           READY FOR WORK
           ================================================================ -->
      <section class="section" aria-labelledby="ready-heading">
        <div class="section__header">
          <h2 class="section__title" id="ready-heading">Ready for Work</h2>
          <span class="section__count">{n_ready_for_work}</span>
        </div>
        <p class="section__intro">These initiatives are scoped, approved, and awaiting resource availability to begin.</p>

        <div class="initiative-grid">
          {rfw_cards_html}
        </div><!-- /.initiative-grid -->
      </section>

      <!-- ================================================================
           QUEUED INITIATIVES
           ================================================================ -->
      <section class="section" aria-labelledby="queued-heading">
        <div class="section__header">
          <h2 class="section__title" id="queued-heading">Queued Initiatives</h2>
          <span class="section__count">{n_queued}</span>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table" aria-label="Queued initiatives table">
            <thead>
              <tr>
                <th scope="col">Initiative</th>
                <th scope="col">Category</th>
                <th scope="col">Sponsor / Owner</th>
                <th scope="col">Need By</th>
                <th scope="col">Impact</th>
              </tr>
            </thead>
            <tbody>
              {queued_rows_html}
            </tbody>
          </table>
        </div>
        {queued_note_html}
      </section>

      <!-- ================================================================
           RECENTLY COMPLETED
           ================================================================ -->
      <section class="section" aria-labelledby="completed-heading">
        <div class="section__header">
          <h2 class="section__title" id="completed-heading">Recently Completed</h2>
          <span class="section__count">{n_done}</span>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table" aria-label="Recently completed initiatives table">
            <thead>
              <tr>
                <th scope="col">Initiative</th>
                <th scope="col">Category</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {done_rows_html}
            </tbody>
          </table>
        </div>
      </section>

      <!-- ================================================================
           FOOTER NOTE
           ================================================================ -->
      <div class="slack-footer" role="note">
        <strong>Questions or new requests?</strong> Questions about prioritization, capacity, or a specific initiative? Reach out to your RIC point of contact or submit new requests through the intake process — all new asks are reviewed against current capacity before scheduling begins.
      </div>

    </div><!-- /.page-container -->
  </main>

  <!-- Footer -->
  <footer class="site-footer" role="contentinfo">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <span class="site-footer__badge" aria-hidden="true">RIC</span>
        <span class="site-footer__name">eSimplicity Rapid Innovation Center</span>
      </div>
      <p class="site-footer__copy">© {year_str} eSimplicity. Internal use only. &nbsp;·&nbsp; Report generated {h(today_str)}.</p>
      <p class="site-footer__note">
        This report reflects status as of the week of {h(week_date_str)}.
        For the most current initiative status, visit the <a href="{BOARD_URL}" target="_blank" rel="noopener noreferrer">RIC Jira Board</a>.
      </p>
    </div>
  </footer>

</body>
</html>
"""


# ---------------------------------------------------------------------------
# index.html updater
# ---------------------------------------------------------------------------

def monday_of_week(d):
    """Return the Monday of the week containing date d."""
    return d - datetime.timedelta(days=d.weekday())


def format_display_date(d):
    """Format date as 'May 5, 2026'."""
    return d.strftime("%B %-d, %Y")


def get_quarter_str(d):
    q = math.ceil(d.month / 3)
    return f"Q{q} {d.year}"


def build_featured_card(report_filename, week_date, n_active, n_blocked, n_queued, n_done):
    """Return the HTML for the featured (latest) report card on the index page."""
    date_str    = format_display_date(week_date)
    quarter_str = get_quarter_str(week_date)
    rel_path    = f"reports/{report_filename}"

    blocked_pill = f'<span class="featured-card__pill">{n_blocked} Blocked</span>' if n_blocked else ""

    return f"""        <a href="{rel_path}" class="featured-card" aria-label="View report: RIC Weekly Report – Week of {date_str}">
          <div class="featured-card__eyebrow">
            <span class="featured-card__new-badge">New</span>
          </div>
          <h2 class="featured-card__title">Week of {date_str}</h2>
          <div class="featured-card__meta">
            <span class="featured-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              {date_str}
            </span>
            <span class="featured-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              {quarter_str}
            </span>
            <span class="featured-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1.5C5 1.5 2.5 4 2.5 7c0 4 5.5 7.5 5.5 7.5s5.5-3.5 5.5-7.5c0-3-2.5-5.5-5.5-5.5z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="7" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg>
              eSimplicity RIC
            </span>
          </div>
          <p class="featured-card__summary">
            {n_active} active initiative{"s" if n_active != 1 else ""} across BD/Growth, Program, and Corporate tracks. Team is operating at full capacity{f" — {n_blocked} blocked initiative{'s' if n_blocked != 1 else ''} requiring leadership attention" if n_blocked else ""}{f", {n_queued} item{'s' if n_queued != 1 else ''} queued" if n_queued else ""}{f", and {n_done} deliverable{'s' if n_done != 1 else ''} completed this cycle" if n_done else ""}.
          </p>
          <div class="featured-card__pills">
            <span class="featured-card__pill">{n_active} Active</span>
            {blocked_pill}
            <span class="featured-card__pill">{n_queued} Queued</span>
            <span class="featured-card__pill">{n_done} Completed</span>
            <span class="featured-card__pill">Full Capacity</span>
          </div>
          <span class="featured-card__cta">
            Read Full Report
            <span class="featured-card__cta-arrow" aria-hidden="true">→</span>
          </span>
        </a>"""


def build_archive_item(report_filename, week_date):
    """Return the HTML for one archive list item."""
    date_str    = format_display_date(week_date)
    quarter_str = get_quarter_str(week_date)
    rel_path    = f"reports/{report_filename}"
    return f"""          <a href="{rel_path}" class="archive-item">
            <div class="archive-item__left">
              <div class="archive-item__dot" aria-hidden="true"></div>
              <div>
                <div class="archive-item__title">RIC Weekly Report – Week of {date_str}</div>
                <div class="archive-item__date">Published {date_str} &nbsp;·&nbsp; {quarter_str}</div>
              </div>
            </div>
            <span class="archive-item__arrow" aria-hidden="true">→</span>
          </a>"""


def update_index(index_path, report_filename, week_date, n_active, n_blocked, n_queued, n_done):
    """
    Read the existing index.html and update:
    1. The "Latest Report" featured card
    2. Prepend the new report to the archive list
    3. Update the stats strip counts
    """
    with open(index_path, "r", encoding="utf-8") as fh:
        content = fh.read()

    # -----------------------------------------------------------------------
    # 1. Replace the featured card content between its landmark comments.
    #    We look for the <a … class="featured-card" block and replace it.
    # -----------------------------------------------------------------------
    new_featured = build_featured_card(
        report_filename, week_date, n_active, n_blocked, n_queued, n_done
    )
    featured_pattern = re.compile(
        r'<a\s+href="reports/[^"]+"\s+class="featured-card".*?</a>',
        re.DOTALL,
    )
    if featured_pattern.search(content):
        content = featured_pattern.sub(new_featured, content, count=1)
        print("  Updated featured card in index.html")
    else:
        print("  WARNING: Could not locate featured-card anchor to replace.")

    # -----------------------------------------------------------------------
    # 2. Prepend new archive item at the top of .archive-list
    # -----------------------------------------------------------------------
    new_archive_item = build_archive_item(report_filename, week_date)
    archive_list_pattern = re.compile(
        r'(<div class="archive-list">)',
        re.DOTALL,
    )
    if archive_list_pattern.search(content):
        content = archive_list_pattern.sub(
            r'\1\n' + new_archive_item,
            content,
            count=1,
        )
        print("  Prepended new archive item in index.html")
    else:
        print("  WARNING: Could not locate archive-list div.")

    # -----------------------------------------------------------------------
    # 3. Update stats strip – count how many archive items are in the file
    #    by counting the pattern, then update the stat values.
    # -----------------------------------------------------------------------
    # Count total reports (each archive item is one report)
    total_reports = len(re.findall(r'class="archive-item"', content))

    def replace_stat(html, label_text, new_value):
        pattern = re.compile(
            r'(<div class="stat-item__value">)\d+(<\/div>\s*<div class="stat-item__label">'
            + re.escape(label_text) + r')',
            re.DOTALL,
        )
        return pattern.sub(r'\g<1>' + str(new_value) + r'\g<2>', html, count=1)

    content = replace_stat(content, "Reports Published",    total_reports)
    content = replace_stat(content, "Active Initiatives",   n_active)
    content = replace_stat(content, "Queued Requests",      n_queued)
    content = replace_stat(content, "Completed This Cycle", n_done)

    # 4. Update archive count badge
    count_label = f"{total_reports} report{'s' if total_reports != 1 else ''}"
    content = re.sub(
        r'(<span class="section__count">)\d+ reports?(<\/span>)',
        r'\g<1>' + count_label + r'\g<2>',
        content,
        count=1,
    )

    with open(index_path, "w", encoding="utf-8") as fh:
        fh.write(content)

    print(f"  index.html updated. Total reports: {total_reports}")


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("RIC Weekly Report Generator")
    print("=" * 60)

    # Validate env vars
    missing = []
    if not JIRA_URL:
        missing.append("JIRA_URL")
    if not JIRA_EMAIL:
        missing.append("JIRA_EMAIL")
    if not JIRA_API_TOKEN:
        missing.append("JIRA_API_TOKEN")
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    print(f"Jira URL:   {JIRA_URL}")
    print(f"Jira Email: {JIRA_EMAIL}")
    print()

    # Determine report date (Monday of current week)
    today       = datetime.date.today()
    report_date = monday_of_week(today)
    week_str    = format_display_date(report_date)
    quarter_str = get_quarter_str(report_date)
    filename    = f"{report_date.strftime('%Y-%m-%d')}.html"

    print(f"Report week: {week_str} ({quarter_str})")
    print(f"Output file: reports/{filename}")
    print()

    # Resolve paths relative to this script's location
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    reports_dir = os.path.join(script_dir, "reports")
    index_path  = os.path.join(script_dir, "index.html")
    output_path = os.path.join(reports_dir, filename)

    os.makedirs(reports_dir, exist_ok=True)

    # Fetch data from Jira
    print("Fetching initiatives from Jira …")
    try:
        raw_issues = fetch_all_initiatives()
    except requests.exceptions.HTTPError as exc:
        print(f"ERROR: Jira API request failed: {exc}")
        print(f"Response: {exc.response.text[:500] if exc.response else 'N/A'}")
        sys.exit(1)
    except requests.exceptions.RequestException as exc:
        print(f"ERROR: Network error: {exc}")
        sys.exit(1)

    print()

    # Categorize
    print("Categorizing issues …")
    active, ready_for_work, queued, done = categorize_issues(raw_issues)
    n_blocked = sum(
        1 for i in active
        if get_text(i.get("fields", {}).get("status"), "") == "Blocked"
    )
    print(f"  In Progress:    {len(active)} (blocked: {n_blocked})")
    print(f"  Ready for Work: {len(ready_for_work)}")
    print(f"  Queued:         {len(queued)}")
    print(f"  Done:           {len(done)}")
    print()

    # Generate HTML
    print("Generating HTML report …")
    html = generate_html(active, ready_for_work, queued, done, report_date, week_str, quarter_str)

    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"  Written: {output_path}")
    print()

    # Update index
    print("Updating index.html …")
    if os.path.exists(index_path):
        update_index(
            index_path,
            filename,
            report_date,
            len(active),
            n_blocked,
            len(queued),
            len(done),
        )
    else:
        print(f"  WARNING: {index_path} not found; skipping index update.")
    print()

    print("=" * 60)
    print(f"Report generated successfully!")
    print(f"Path: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
