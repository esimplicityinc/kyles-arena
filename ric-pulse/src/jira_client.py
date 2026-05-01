"""
Jira API Client for RIC Pulse
Fetches initiative data from the RIC Jira project.
"""

import os
import requests
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
from dataclasses import dataclass
from functools import lru_cache


@dataclass
class JiraConfig:
    """Jira API configuration"""
    base_url: str = "https://esimplicity.atlassian.net"
    project_key: str = "RIC"
    email: str = ""
    api_token: str = ""
    
    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        return cls(
            base_url=os.getenv("JIRA_BASE_URL", "https://esimplicity.atlassian.net"),
            project_key=os.getenv("JIRA_PROJECT_KEY", "RIC"),
            email=os.getenv("JIRA_EMAIL", ""),
            api_token=os.getenv("JIRA_API_TOKEN", "")
        )


class JiraClient:
    """Client for interacting with Jira REST API"""
    
    def __init__(self, config: Optional[JiraConfig] = None):
        self.config = config or JiraConfig.from_env()
        self._session = None
    
    @property
    def session(self) -> requests.Session:
        """Get authenticated session"""
        if self._session is None:
            self._session = requests.Session()
            if self.config.email and self.config.api_token:
                self._session.auth = (self.config.email, self.config.api_token)
            self._session.headers.update({
                "Accept": "application/json",
                "Content-Type": "application/json"
            })
        return self._session
    
    def is_configured(self) -> bool:
        """Check if Jira credentials are configured"""
        return bool(self.config.email and self.config.api_token)
    
    def _make_request(self, endpoint: str, params: dict = None) -> dict:
        """Make authenticated request to Jira API"""
        url = f"{self.config.base_url}/rest/api/3/{endpoint}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def search_issues(self, jql: str, fields: str = "*all", max_results: int = 100) -> list:
        """Search issues using JQL"""
        all_issues = []
        start_at = 0
        
        while True:
            params = {
                "jql": jql,
                "fields": fields,
                "maxResults": min(max_results - len(all_issues), 100),
                "startAt": start_at
            }
            
            result = self._make_request("search", params)
            issues = result.get("issues", [])
            all_issues.extend(issues)
            
            if len(all_issues) >= result.get("total", 0) or len(issues) == 0:
                break
            
            start_at += len(issues)
            
            if len(all_issues) >= max_results:
                break
        
        return all_issues
    
    def get_initiatives(self) -> pd.DataFrame:
        """Get all RIC initiatives"""
        jql = f'project = {self.config.project_key} AND issuetype = Initiative ORDER BY updated DESC'
        fields = "summary,status,priority,labels,created,updated,assignee,duedate"
        
        issues = self.search_issues(jql, fields, max_results=200)
        
        data = []
        for issue in issues:
            fields_data = issue.get("fields", {})
            status = fields_data.get("status", {})
            priority = fields_data.get("priority", {})
            assignee = fields_data.get("assignee", {})
            labels = fields_data.get("labels", [])
            
            # Determine business unit from labels
            bu = "Other"
            for label in labels:
                if label in ["Health", "Civilian", "DNS"]:
                    bu = label
                    break
            
            # Determine category from labels
            category = "Program"
            if "BD/Growth" in labels:
                category = "Growth"
            elif "Corporate" in labels:
                category = "Corporate"
            elif "RIC" in labels:
                category = "RIC"
            
            data.append({
                "key": issue.get("key"),
                "summary": fields_data.get("summary", ""),
                "status": status.get("name", "") if status else "",
                "status_category": status.get("statusCategory", {}).get("name", "") if status else "",
                "priority": priority.get("name", "") if priority else "",
                "business_unit": bu,
                "category": category,
                "labels": labels,
                "assignee": assignee.get("displayName", "") if assignee else "Unassigned",
                "created": fields_data.get("created", ""),
                "updated": fields_data.get("updated", ""),
                "due_date": fields_data.get("duedate", "")
            })
        
        return pd.DataFrame(data)
    
    def get_initiative_details(self, issue_key: str) -> dict:
        """Get detailed information about a specific initiative including child issues"""
        # Get the initiative
        initiative = self._make_request(f"issue/{issue_key}", {
            "fields": "summary,status,priority,labels,description,created,updated,assignee,duedate"
        })
        
        # Get child epics
        jql = f'parent = {issue_key} ORDER BY status ASC'
        epics = self.search_issues(jql, "summary,status,priority,assignee,updated", max_results=50)
        
        return {
            "initiative": initiative,
            "epics": epics
        }
    
    def get_issues_updated_since(self, days: int = 7) -> pd.DataFrame:
        """Get all issues updated in the last N days"""
        jql = f'project = {self.config.project_key} AND updated >= -{days}d ORDER BY updated DESC'
        fields = "summary,status,issuetype,priority,labels,updated,parent"
        
        issues = self.search_issues(jql, fields, max_results=100)
        
        data = []
        for issue in issues:
            fields_data = issue.get("fields", {})
            status = fields_data.get("status", {})
            issuetype = fields_data.get("issuetype", {})
            parent = fields_data.get("parent", {})
            
            data.append({
                "key": issue.get("key"),
                "summary": fields_data.get("summary", ""),
                "status": status.get("name", "") if status else "",
                "issue_type": issuetype.get("name", "") if issuetype else "",
                "updated": fields_data.get("updated", ""),
                "parent_key": parent.get("key", "") if parent else "",
                "parent_summary": parent.get("fields", {}).get("summary", "") if parent else ""
            })
        
        return pd.DataFrame(data)
    
    def get_status_summary(self) -> pd.DataFrame:
        """Get initiative counts by status"""
        df = self.get_initiatives()
        if df.empty:
            return pd.DataFrame(columns=["status", "count"])
        
        # Map statuses to simplified categories
        status_map = {
            "To Do": "To Do",
            "Discovery": "Discovery",
            "Ready For Prioritization": "Ready",
            "Delivery / Execution": "In Progress",
            "Expansion / Scale": "Scaling",
            "Done": "Done",
            "Blocked": "Blocked"
        }
        
        df["status_simple"] = df["status"].map(lambda x: status_map.get(x, x))
        
        summary = df.groupby("status_simple").size().reset_index(name="count")
        return summary
    
    def get_bu_summary(self) -> pd.DataFrame:
        """Get initiative counts by business unit"""
        df = self.get_initiatives()
        if df.empty:
            return pd.DataFrame(columns=["business_unit", "count"])
        
        summary = df.groupby("business_unit").size().reset_index(name="count")
        return summary
    
    def get_weekly_metrics(self) -> dict:
        """Get metrics for the weekly report"""
        initiatives_df = self.get_initiatives()
        recent_df = self.get_issues_updated_since(7)
        
        if initiatives_df.empty:
            return {
                "total_initiatives": 0,
                "in_progress": 0,
                "completed": 0,
                "items_updated": 0,
                "initiatives_by_status": {},
                "initiatives_by_bu": {}
            }
        
        # Count by status
        status_counts = initiatives_df.groupby("status").size().to_dict()
        
        # Count by BU
        bu_counts = initiatives_df.groupby("business_unit").size().to_dict()
        
        # Count done items
        done_count = len(initiatives_df[initiatives_df["status"] == "Done"])
        
        # Count in progress (includes Delivery/Execution, Expansion/Scale)
        in_progress_statuses = ["Delivery / Execution", "Expansion / Scale", "Discovery"]
        in_progress_count = len(initiatives_df[initiatives_df["status"].isin(in_progress_statuses)])
        
        return {
            "total_initiatives": len(initiatives_df),
            "in_progress": in_progress_count,
            "completed": done_count,
            "items_updated": len(recent_df),
            "initiatives_by_status": status_counts,
            "initiatives_by_bu": bu_counts,
            "recent_updates": recent_df
        }


# Singleton instance for caching
_client_instance: Optional[JiraClient] = None


def get_jira_client() -> JiraClient:
    """Get or create Jira client singleton"""
    global _client_instance
    if _client_instance is None:
        _client_instance = JiraClient()
    return _client_instance


def clear_cache():
    """Clear the client cache"""
    global _client_instance
    _client_instance = None
