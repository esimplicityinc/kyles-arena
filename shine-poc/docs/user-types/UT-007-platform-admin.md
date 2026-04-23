---
id: UT-007
name: "Platform & Admin"
tag: "@UT-007"
type: human
status: approved
archetype: administrator
description: "Technical operators ensuring SHINE runs reliably and securely"
includes:
  - "IT Admins"
  - "Platform Engineers"
  - "Security Team"
  - "DevOps Engineers"
goals:
  - "Keep SHINE running reliably"
  - "Manage integrations with external systems"
  - "Handle access and permission issues"
  - "Ensure security and compliance"
pain_points:
  - "Integration failures with source systems"
  - "API rate limits and throttling"
  - "Access and permission issues"
  - "Lack of system visibility and alerting"
behaviors:
  - "Monitors health dashboards and alerts"
  - "Configures and troubleshoots integrations"
  - "Manages SSO and access controls"
  - "Responds to incidents and outages"
technical_profile:
  skill_level: advanced
  integration_type: web_ui
  frequency: daily
related_user_types: []
created: "2026-04-13"
updated: "2026-04-13"
---

# Platform & Admin

## Overview

Platform & Admin users keep SHINE operational. They manage the technical infrastructure, integrations, security, and access controls that enable all other users to do their work. When something breaks, they're the first responders. They need deep visibility into system health, integration status, and security posture. SHINE must provide robust admin tooling to support them.

## Key Workflows

1. **Health Monitoring** - Track system performance, uptime, and resource utilization
2. **Integration Management** - Configure, monitor, and troubleshoot connections to source systems
3. **Access Control** - Manage users, roles, permissions, and SSO configuration
4. **Incident Response** - Diagnose and resolve issues when they occur
5. **Security Audit** - Review access logs, ensure compliance, manage data retention

## Interaction Pattern

- **Entry Point:** Admin console or health dashboard
- **Session Length:** Variable (quick checks to extended troubleshooting)
- **Primary Actions:** Configure, monitor, troubleshoot, audit, manage users
- **Preferred Output:** System metrics, logs, alerts, configuration status

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| System uptime | > 99.5% | Reliability is table stakes |
| Integration health | > 95% green | Data freshness depends on this |
| Incident MTTR | < 2 hours | Quick recovery |
| Access issues resolved | < 24 hours | Unblock users quickly |
