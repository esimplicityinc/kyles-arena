# Partnership Tracker Enhancement Checklist

**File to modify:** `index.html`

**Specs document:** `/Users/kyle.hogan/Downloads/partnership-tracker-specs.docx`

---

## HIGH PRIORITY

### E-01: Executive Summary Header
> "Add 4 partner status cards (AWS, Databricks, Salesforce, Snowflake) between the header and tab navigation. Each card shows: partner logo, current→target tier, progress %, and a RAG dot (Green ≥70%, Amber 30-69%, Red <30%). Clicking a card scrolls to that partner. Use colors: Twilight #3223BD, Pale Purple #D9DCF8."

### E-02: Enhanced Data Entry
> "Enhance the certification table inputs to flash green (#E8F8EE) on save, recalculate all progress bars AND the summary cards in real-time, and add a 'Reset All Data' button in the footer with a confirmation dialog."

### E-03: Timestamp + Author
> "Show a modal on first visit asking for the user's name. Store it in localStorage. When any data changes, update the 'Updated:' field in the header to show 'April 17, 2026 at 2:34 PM — Kyle Hogan'. Add a small 'change' link to update the name."

---

## MEDIUM PRIORITY

### E-04: Owner Column
> "Add an 'Owner' column to the certifications table. Default value is 'Unassigned' with amber background (#FEF3E2). Click to edit (max 40 chars). Persist in localStorage."

### E-05: Milestone Alert Banner
> "Add a dismissible banner below the summary cards showing any roadmap milestones due within 30 days. Store dismissed milestone IDs in localStorage so they don't reappear."

### E-06: PAM Contact Info
> "Make the PAM cards in the Stakeholders tab editable with fields for: name, email, LinkedIn, phone, and last contact date. Persist in localStorage."

---

## LOW PRIORITY

### E-07: Mobile Tables
> "Wrap all tables in a scrollable container. Add CSS so the Risk Register table shows as cards on mobile screens under 600px wide."

---

## localStorage Keys to Use

| Key Pattern | Type | Description |
|-------------|------|-------------|
| `cert_progress_{partner}_{cert_slug}` | Number | Current count for each certification |
| `cert_owner_{partner}_{cert_slug}` | String | Owner name for each certification |
| `last_updated` | String | ISO datetime + name, pipe-delimited |
| `user_display_name` | String | The user's display name |
| `dismissed_milestones` | JSON Array | Milestone IDs user has dismissed |
| `pam_info_{partner}` | JSON Object | PAM contact details |
| `pam_last_contact_{partner}` | String | ISO date of last PAM contact |

**Slug conventions:** partner = `aws` | `databricks` | `salesforce` | `snowflake`. Cert slugs are lowercase, hyphenated (e.g., `cloud-practitioner`, `solutions-architect-associate`).

---

## Brand Colors

- **Twilight:** #3223BD (headers, accents)
- **Pale Purple:** #D9DCF8 (card backgrounds, banner)
- **RAG Red:** #C0392B
- **RAG Amber:** #E67E22
- **RAG Green:** #27AE60
- **Save Flash:** #E8F8EE
- **Unassigned Amber:** #FEF3E2

---

## Open Questions (resolve before implementing)

1. PAM names and contact info for each partner
2. Default certification owners
3. Current certification counts (enter after E-02 is done)
4. Should "Reset All Data" be restricted?
