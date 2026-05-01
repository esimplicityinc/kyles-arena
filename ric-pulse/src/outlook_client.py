"""
Outlook Calendar Integration for RIC Pulse
Fetches consultation session data from Outlook calendar.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List
import pandas as pd
from dataclasses import dataclass


@dataclass
class OutlookConfig:
    """Outlook API configuration"""
    client_id: str = ""
    client_secret: str = ""
    tenant_id: str = ""
    calendar_email: str = ""
    
    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        return cls(
            client_id=os.getenv("OUTLOOK_CLIENT_ID", ""),
            client_secret=os.getenv("OUTLOOK_CLIENT_SECRET", ""),
            tenant_id=os.getenv("OUTLOOK_TENANT_ID", ""),
            calendar_email=os.getenv("OUTLOOK_CALENDAR_EMAIL", "")
        )


class OutlookClient:
    """
    Client for interacting with Microsoft Graph API for calendar data.
    
    Classification is based on Outlook calendar category tags:
    - Events tagged "Growth" are counted as BD/Growth consultation sessions
    - Events tagged "Program" are counted as Program consultation sessions
    - All other events are ignored
    """
    
    def __init__(self, config: Optional[OutlookConfig] = None):
        self.config = config or OutlookConfig.from_env()
        self._access_token = None
    
    def is_configured(self) -> bool:
        """Check if Outlook credentials are configured"""
        return bool(
            self.config.client_id and
            self.config.client_secret and
            self.config.tenant_id and
            self.config.calendar_email
        )

    def clear_token_cache(self):
        """Clear cached access token so next request re-authenticates"""
        self._access_token = None
    
    def _get_access_token(self) -> str:
        """Get OAuth2 access token for Microsoft Graph API"""
        if self._access_token:
            return self._access_token

        import requests

        token_url = f"https://login.microsoftonline.com/{self.config.tenant_id}/oauth2/v2.0/token"

        data = {
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }

        response = requests.post(token_url, data=data)

        # Surface the real error from Azure if token fetch failed
        token_data = response.json()
        if "access_token" not in token_data:
            error = token_data.get("error", "unknown_error")
            description = token_data.get("error_description", "No description returned from Azure AD.")
            raise ValueError(
                f"Azure AD token error [{error}]: {description}\n\n"
                f"Common fixes:\n"
                f"  • Make sure the Azure app has 'Calendars.Read' API permission (Application type, not Delegated)\n"
                f"  • Make sure an admin has granted consent to those permissions\n"
                f"  • Double-check your Client ID, Client Secret, and Tenant ID are correct\n"
                f"  • Ensure the client secret has not expired"
            )

        self._access_token = token_data["access_token"]
        return self._access_token
    
    def _make_request(self, endpoint: str, params: dict = None) -> dict:
        """Make authenticated request to Microsoft Graph API"""
        import requests
        
        url = f"https://graph.microsoft.com/v1.0/{endpoint}"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_calendar_events(
        self, 
        start_date: datetime = None, 
        end_date: datetime = None,
        user_email: str = None
    ) -> List[dict]:
        """Get calendar events within a date range"""
        if start_date is None:
            start_date = datetime.now() - timedelta(days=30)
        if end_date is None:
            end_date = datetime.now() + timedelta(days=7)
        
        email = user_email or self.config.calendar_email
        
        # Format dates for Graph API
        start_str = start_date.strftime("%Y-%m-%dT00:00:00Z")
        end_str = end_date.strftime("%Y-%m-%dT23:59:59Z")
        
        endpoint = f"users/{email}/calendar/events"
        params = {
            "$filter": f"start/dateTime ge '{start_str}' and end/dateTime le '{end_str}'",
            "$orderby": "start/dateTime",
            "$top": 500,
            "$select": "subject,start,end,attendees,categories,bodyPreview,organizer"
        }
        
        result = self._make_request(endpoint, params)
        return result.get("value", [])
    
    def classify_event(self, event: dict) -> Optional[str]:
        """
        Classify an event as a consultation session type using Outlook category tags.
        
        Events tagged with the "Growth" Outlook category → BD/Growth consult
        Events tagged with the "Program" Outlook category → Program consult
        
        Returns: 'BD', 'Program', or None if not a RIC consult
        """
        categories = event.get("categories", [])
        
        if "Growth" in categories:
            return "BD"
        if "Program" in categories:
            return "Program"
        
        return None  # not tagged as a RIC consult — ignore
    
    def get_consultation_sessions(
        self,
        start_date: datetime = None,
        end_date: datetime = None,
        user_email: str = None
    ) -> pd.DataFrame:
        """Get consultation sessions from calendar"""
        events = self.get_calendar_events(start_date, end_date, user_email)
        
        sessions = []
        for event in events:
            session_type = self.classify_event(event)
            if session_type:
                start = event.get("start", {})
                end = event.get("end", {})
                
                # Get attendee count
                attendees = event.get("attendees", [])
                attendee_count = len(attendees)
                
                # Get organizer
                organizer = event.get("organizer", {}).get("emailAddress", {})
                
                sessions.append({
                    "date": start.get("dateTime", "")[:10],
                    "subject": event.get("subject", ""),
                    "type": session_type,
                    "start_time": start.get("dateTime", ""),
                    "end_time": end.get("dateTime", ""),
                    "attendee_count": attendee_count,
                    "organizer": organizer.get("name", ""),
                    "organizer_email": organizer.get("address", "")
                })
        
        return pd.DataFrame(sessions)
    
    def get_weekly_session_counts(
        self,
        weeks: int = 8,
        user_email: str = None
    ) -> pd.DataFrame:
        """Get consultation session counts by week"""
        end_date = datetime.now()
        start_date = end_date - timedelta(weeks=weeks * 7)
        
        sessions_df = self.get_consultation_sessions(start_date, end_date, user_email)
        
        if sessions_df.empty:
            return pd.DataFrame(columns=['Week', 'BD Sessions', 'Program Sessions', 'Total'])
        
        # Convert date string to datetime
        sessions_df['date'] = pd.to_datetime(sessions_df['date'])
        
        # Get week start (Monday)
        sessions_df['week_start'] = sessions_df['date'].dt.to_period('W-SAT').dt.start_time
        
        # Count by week and type
        weekly = sessions_df.groupby(['week_start', 'type']).size().unstack(fill_value=0)
        weekly = weekly.reset_index()
        
        # Ensure both columns exist
        if 'BD' not in weekly.columns:
            weekly['BD'] = 0
        if 'Program' not in weekly.columns:
            weekly['Program'] = 0
        
        weekly['Total'] = weekly['BD'] + weekly['Program']
        weekly['Week'] = weekly['week_start'].dt.strftime('%m/%d')
        
        weekly = weekly.rename(columns={
            'BD': 'BD Sessions',
            'Program': 'Program Sessions'
        })
        
        return weekly[['Week', 'BD Sessions', 'Program Sessions', 'Total']]


# Singleton instance
_client_instance: Optional[OutlookClient] = None


def get_outlook_client() -> OutlookClient:
    """Get or create Outlook client singleton"""
    global _client_instance
    if _client_instance is None:
        _client_instance = OutlookClient()
    return _client_instance


def clear_cache():
    """Clear the client cache"""
    global _client_instance
    _client_instance = None
