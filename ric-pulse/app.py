"""
RIC Pulse - Rapid Innovation Center Metrics Dashboard
A Databricks App for tracking RIC activity, impact, and value.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import sys
import os
import base64

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from styles.theme import (
    PRIMARY, PRIMARY_LIGHT, PRIMARY_VERY_LIGHT,
    TEXT_BLACK, TEXT_DARK_GRAY,
    SUCCESS_GREEN, SUCCESS_GREEN_BG,
    WARNING_AMBER, WARNING_AMBER_BG,
    CHART_COLORS, CUSTOM_CSS, get_plotly_layout
)

# Try to import Jira client
try:
    from src.jira_client import get_jira_client, JiraClient
    JIRA_AVAILABLE = True
except ImportError:
    JIRA_AVAILABLE = False
    JiraClient = None

# Page configuration
st.set_page_config(
    page_title="RIC Pulse",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ---------------------------------------------------------------------------
# Real RIC initiative data (hardcoded — no live Jira calls required)
# ---------------------------------------------------------------------------
REAL_INITIATIVES = [
    {"key": "RIC-8",   "summary": "T-MSIS - AI Acceleration",                "status": "Done",          "category": "Health",    "label": "Program",    "priority": "High",     "created": "2026-02-06", "completed": "2026-03-23"},
    {"key": "RIC-9",   "summary": "CQP - Training Material Automation",       "status": "Ready for Work","category": "Health",    "label": "Program",    "priority": "Medium",   "created": "2026-02-06", "completed": None},
    {"key": "RIC-10",  "summary": "QDAS - AI Acceleration",                   "status": "Discovery",     "category": "Health",    "label": "Program",    "priority": "High",     "created": "2026-02-06", "completed": None},
    {"key": "RIC-12",  "summary": "NMSC - Spectrum Analyst Agent",            "status": "Done",          "category": "DNS",       "label": "Program",    "priority": "Critical", "created": "2026-02-06", "completed": "2026-04-02"},
    {"key": "RIC-15",  "summary": "RIC Exploration & Experimentation",        "status": "Always On",     "category": "RIC",       "label": "RIC",        "priority": "High",     "created": "2026-02-06", "completed": None},
    {"key": "RIC-75",  "summary": "DISA AES - RFP AI Assistance",             "status": "Done",          "category": "DNS",       "label": "BD/Growth",  "priority": "Critical", "created": "2026-02-19", "completed": "2026-03-31"},
    {"key": "RIC-88",  "summary": "MACFin",                                   "status": "To Do",         "category": "Health",    "label": "BD/Growth",  "priority": "Low",      "created": "2026-02-20", "completed": None},
    {"key": "RIC-102", "summary": "QDAS - DBX Apps Research",                 "status": "Done",          "category": "Health",    "label": "Program",    "priority": "High",     "created": "2026-03-04", "completed": "2026-03-19"},
    {"key": "RIC-133", "summary": "eSimplicity Quality Management",           "status": "To Do",         "category": "Corporate", "label": "Corporate",  "priority": "Low",      "created": "2026-03-09", "completed": None},
    {"key": "RIC-136", "summary": "LPDS - AI Tools Consultation",             "status": "Done",          "category": "DNS",       "label": "Program",    "priority": "Medium",   "created": "2026-03-09", "completed": "2026-03-11"},
    {"key": "RIC-143", "summary": "Flow Optimized Engineering",               "status": "Always On",     "category": "Corporate", "label": "RIC",        "priority": "Medium",   "created": "2026-03-11", "completed": None},
    {"key": "RIC-144", "summary": "NMSC - Spectrum Management Reports Site",  "status": "Ready for Work","category": "DNS",       "label": "Program",    "priority": "Medium",   "created": "2026-03-13", "completed": None},
    {"key": "RIC-145", "summary": "LCAT Tool",                                "status": "To Do",         "category": "Corporate", "label": "Corporate",  "priority": "Low",      "created": "2026-03-13", "completed": None},
    {"key": "RIC-153", "summary": "T-MSIS - Report Automation",               "status": "To Do",         "category": "Health",    "label": "Program",    "priority": "Low",      "created": "2026-03-17", "completed": None},
    {"key": "RIC-164", "summary": "DBX Apps POC - Use Case 3",                "status": "Done",          "category": "Health",    "label": "BD/Growth",  "priority": "High",     "created": "2026-03-19", "completed": "2026-05-01"},
    {"key": "RIC-171", "summary": "New Mexico RFP Demo",                      "status": "In Progress",   "category": "Civilian",  "label": "BD/Growth",  "priority": "Medium",   "created": "2026-03-20", "completed": None},
    {"key": "RIC-193", "summary": "SBA OIG - AI Innovation for Recompete",    "status": "Done",          "category": "Civilian",  "label": "Program",    "priority": "Medium",   "created": "2026-03-25", "completed": "2026-04-24"},
    {"key": "RIC-194", "summary": "T-MSIS - Security Automation w/ AI",       "status": "Blocked",       "category": "Health",    "label": "Program",    "priority": "High",     "created": "2026-03-26", "completed": None},
    {"key": "RIC-200", "summary": "Nextgen Sim - Prima Marketing Support",    "status": "Done",          "category": "DNS",       "label": "BD/Growth",  "priority": "Critical", "created": "2026-03-27", "completed": "2026-03-27"},
    {"key": "RIC-201", "summary": "CMS MESH - AI Write-up",                   "status": "Done",          "category": "Health",    "label": "BD/Growth",  "priority": "Blocker",  "created": "2026-03-31", "completed": "2026-04-03"},
    {"key": "RIC-204", "summary": "NHLBI - AI Innovation",                    "status": "In Progress",   "category": "Health",    "label": "Program",    "priority": "High",     "created": "2026-04-01", "completed": None},
    {"key": "RIC-205", "summary": "CMS MESH - SalesForce/M365 Integration",   "status": "Done",          "category": "Health",    "label": "BD/Growth",  "priority": "Critical", "created": "2026-04-02", "completed": "2026-04-17"},
    {"key": "RIC-206", "summary": "Growth Portal",                            "status": "Ready for Work","category": "BD/Growth", "label": "BD/Growth",  "priority": "Critical", "created": "2026-04-02", "completed": None},
    {"key": "RIC-207", "summary": "Aberdeen APBI Demo Assistance",            "status": "Done",          "category": "DNS",       "label": "BD/Growth",  "priority": "Medium",   "created": "2026-04-02", "completed": "2026-04-10"},
    {"key": "RIC-261", "summary": "Create Apex Package - T-MSIS",             "status": "In Progress",   "category": "Health",    "label": "Program",    "priority": "Critical", "created": "2026-04-14", "completed": None},
    {"key": "RIC-268", "summary": "IDR - Research POC/White Paper",           "status": "In Progress",   "category": "Health",    "label": "BD/Growth",  "priority": "Blocker",  "created": "2026-04-16", "completed": None},
    {"key": "RIC-316", "summary": "T-MSIS - Test Automation",                 "status": "Discovery",     "category": "Health",    "label": "Program",    "priority": "Low",      "created": "2026-04-22", "completed": None},
    {"key": "RIC-329", "summary": "DBX Apps POC - Use Case 4",                "status": "In Progress",   "category": "Health",    "label": "BD/Growth",  "priority": "High",     "created": "2026-04-24", "completed": None},
    {"key": "RIC-340", "summary": "SHINE",                                    "status": "Always On",     "category": "Corporate", "label": "RIC",        "priority": "Critical", "created": "2026-04-27", "completed": None},
]

WEEKLY_SNAPSHOTS = [
    {"week": "Feb 9",  "week_start": "2026-02-09", "total": 5,  "discovery": 0, "active": 0, "always_on": 0, "done_cumulative": 0,  "backlog": 5,  "blocked": 0},
    {"week": "Feb 16", "week_start": "2026-02-16", "total": 6,  "discovery": 0, "active": 0, "always_on": 0, "done_cumulative": 0,  "backlog": 6,  "blocked": 0},
    {"week": "Feb 23", "week_start": "2026-02-23", "total": 6,  "discovery": 0, "active": 0, "always_on": 0, "done_cumulative": 0,  "backlog": 6,  "blocked": 0},
    {"week": "Mar 2",  "week_start": "2026-03-02", "total": 8,  "discovery": 0, "active": 0, "always_on": 1, "done_cumulative": 0,  "backlog": 7,  "blocked": 0},
    {"week": "Mar 9",  "week_start": "2026-03-09", "total": 10, "discovery": 0, "active": 0, "always_on": 1, "done_cumulative": 1,  "backlog": 8,  "blocked": 0},
    {"week": "Mar 16", "week_start": "2026-03-16", "total": 11, "discovery": 3, "active": 0, "always_on": 1, "done_cumulative": 2,  "backlog": 5,  "blocked": 0},
    {"week": "Mar 23", "week_start": "2026-03-23", "total": 13, "discovery": 3, "active": 1, "always_on": 1, "done_cumulative": 4,  "backlog": 4,  "blocked": 0},
    {"week": "Mar 30", "week_start": "2026-03-30", "total": 20, "discovery": 2, "active": 3, "always_on": 1, "done_cumulative": 7,  "backlog": 7,  "blocked": 0},
    {"week": "Apr 6",  "week_start": "2026-04-06", "total": 21, "discovery": 2, "active": 3, "always_on": 1, "done_cumulative": 8,  "backlog": 7,  "blocked": 0},
    {"week": "Apr 13", "week_start": "2026-04-13", "total": 23, "discovery": 2, "active": 4, "always_on": 1, "done_cumulative": 9,  "backlog": 7,  "blocked": 0},
    {"week": "Apr 20", "week_start": "2026-04-20", "total": 26, "discovery": 2, "active": 5, "always_on": 1, "done_cumulative": 9,  "backlog": 6,  "blocked": 1},
    {"week": "Apr 27", "week_start": "2026-04-27", "total": 29, "discovery": 2, "active": 6, "always_on": 3, "done_cumulative": 10, "backlog": 4,  "blocked": 1},
    {"week": "May 1",  "week_start": "2026-05-01", "total": 29, "discovery": 2, "active": 6, "always_on": 3, "done_cumulative": 11, "backlog": 4,  "blocked": 1},
]

WEEKLY_COMPLETIONS = [
    {"week": "Feb 9",  "completed": 0},
    {"week": "Feb 16", "completed": 0},
    {"week": "Feb 23", "completed": 0},
    {"week": "Mar 2",  "completed": 0},
    {"week": "Mar 9",  "completed": 1},
    {"week": "Mar 16", "completed": 1},
    {"week": "Mar 23", "completed": 2},
    {"week": "Mar 30", "completed": 3},
    {"week": "Apr 6",  "completed": 1},
    {"week": "Apr 13", "completed": 1},
    {"week": "Apr 20", "completed": 1},
    {"week": "Apr 27", "completed": 0},
    {"week": "May 1",  "completed": 1},
]

# RIC Pulse Logo as base64 data URI (works reliably in Streamlit)
RIC_LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyMiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjE4IiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjI1Ii8+PHBhdGggZD0iTTggMjQgTDE2IDI0IEwxOSAxOCBMMjIgMzAgTDI1IDE0IEwyOCAyOCBMMzEgMjAgTDM0IDI0IEw0MCAyNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjMiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOCIvPjwvc3ZnPg=="

# Modern CSS with header bar
MODERN_CSS = """
<style>
    /* Remove default padding */
    .block-container {
        padding-top: 0 !important;
        padding-bottom: 2rem !important;
    }
    
    /* Hide default header */
    header[data-testid="stHeader"] {
        display: none;
    }
    
    /* Hide sidebar */
    [data-testid="stSidebar"] {
        display: none;
    }
    
    /* Top header bar */
    .top-header {
        background: linear-gradient(135deg, #3223BD 0%, #4A3BC7 100%);
        padding: 0.75rem 2rem;
        margin: -1rem -1rem 0 -1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(50, 35, 189, 0.15);
    }
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .header-logo-img {
        width: 48px;
        height: 48px;
    }
    
    .header-title {
        display: flex;
        flex-direction: column;
    }
    
    .header-title h1 {
        color: white;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
        letter-spacing: 0.5px;
    }
    
    .header-title span {
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.75rem;
        font-weight: 400;
    }
    
    .header-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
    }
    
    .header-badge {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        font-size: 0.65rem;
        font-weight: 600;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .header-date {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.7rem;
    }
    
    /* Tab styling - more compact */
    .stTabs {
        margin-top: 0.5rem;
    }
    
    .stTabs [data-baseweb="tab-list"] {
        gap: 0;
        background: #F3F3F3;
        border-radius: 8px;
        padding: 4px;
        margin-bottom: 1rem;
    }
    
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        border-radius: 6px;
        padding: 8px 20px;
        font-weight: 600;
        font-size: 0.875rem;
        color: #444441;
    }
    
    .stTabs [aria-selected="true"] {
        background: #3223BD !important;
        color: white !important;
    }
    
    /* KPI row styling */
    .kpi-row {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .kpi-card {
        flex: 1;
        background: white;
        border: 1px solid #E0E0E0;
        border-radius: 12px;
        padding: 1.25rem;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    
    .kpi-value {
        font-size: 2rem;
        font-weight: 700;
        color: #3223BD;
        line-height: 1;
    }
    
    .kpi-label {
        font-size: 0.75rem;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 0.5rem;
    }
    
    /* Improved metric styling */
    [data-testid="stMetricValue"] {
        font-size: 1.75rem !important;
        font-weight: 700 !important;
        color: #1C1C1C !important;
    }
    
    [data-testid="stMetricLabel"] {
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.3px !important;
        color: #666 !important;
    }
    
    /* Expander styling */
    .stExpander {
        background: white;
        border: 1px solid #E0E0E0 !important;
        border-radius: 12px !important;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    
    .stExpander > details {
        border: none !important;
    }
    
    .stExpander > details > summary {
        font-size: 0.9rem;
        font-weight: 700;
        color: #3223BD;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Testimonial cards */
    .testimonial-card {
        background: #FAFAFA;
        border-left: 3px solid #3223BD;
        border-radius: 0 8px 8px 0;
        padding: 1.25rem;
        margin-bottom: 1rem;
    }
    
    .testimonial-quote {
        font-size: 0.95rem;
        color: #333;
        font-style: italic;
        line-height: 1.6;
        margin-bottom: 0.75rem;
    }
    
    .testimonial-attribution {
        font-size: 0.8rem;
        color: #3223BD;
        font-weight: 600;
    }
    
    .testimonial-meta {
        font-size: 0.7rem;
        color: #888;
        margin-top: 0.25rem;
    }
    
    /* Status badges */
    .status-badge {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.65rem;
        font-weight: 600;
    }
    
    .status-high {
        background: #E1F5EE;
        color: #085041;
    }
    
    .status-medium {
        background: #FAEEDA;
        color: #633806;
    }
    
    .status-low {
        background: #F3F3F3;
        color: #666;
    }
</style>
"""

st.markdown(MODERN_CSS, unsafe_allow_html=True)


def load_csat_data():
    """Load CSAT data from session state or sample file"""
    if 'csat_data' in st.session_state and st.session_state.csat_data is not None:
        return st.session_state.csat_data
    
    sample_path = os.path.join(os.path.dirname(__file__), 'data', 'sample_csat.csv')
    if os.path.exists(sample_path):
        return pd.read_csv(sample_path, parse_dates=['Date'])
    
    return None


def render_header():
    """Render the top header bar with RIC Pulse logo"""
    st.markdown(f"""
        <div class="top-header">
            <div class="header-left">
                <img src="{RIC_LOGO_BASE64}" class="header-logo-img" alt="RIC Pulse">
                <div class="header-title">
                    <h1>RIC Pulse</h1>
                    <span>Rapid Innovation Center Metrics</span>
                </div>
            </div>
            <div class="header-right">
                <span class="header-badge">eSimplicity</span>
                <span class="header-date">Last updated: {datetime.now().strftime('%b %d, %Y')}</span>
            </div>
        </div>
    """, unsafe_allow_html=True)


def render_kpi_summary(csat_df):
    """Render the executive KPI summary row — 6 cards"""
    import datetime as dt

    # --- Compute values ---
    # Initiatives
    total_initiatives = len(REAL_INITIATIVES)
    completed = len([i for i in REAL_INITIATIVES if i['status'] == 'Done'])
    active = len([i for i in REAL_INITIATIVES if i['status'] in (
        'In Progress', 'Delivery / Execution', 'Expansion / Scale', 'Reviewing')])

    # Cycle time
    done_items = [i for i in REAL_INITIATIVES if i['completed']]
    cycle_times = [
        (dt.date.fromisoformat(i['completed']) - dt.date.fromisoformat(i['created'])).days
        for i in done_items
    ]
    avg_cycle = round(sum(cycle_times) / len(cycle_times)) if cycle_times else 0

    # CSAT
    avg_csat = csat_df['CSAT (1-5)'].mean() if csat_df is not None and not csat_df.empty else None
    csat_display = f"{avg_csat:.1f} / 5" if avg_csat else "—"
    csat_delta = f"target ≥ 4.0" if avg_csat else None

    # Goals on track — count session state if available, else estimate from progress
    # Simple heuristic: completed initiatives / 18 target ≥ 50% = goal 1 on track
    goals_on_track = 3  # reasonable starting baseline shown until Goals tab is visited

    # Sessions YTD (from hardcoded consult data)
    sessions_ytd = 53

    # --- Render 6 cards ---
    c1, c2, c3, c4, c5, c6 = st.columns(6)

    with c1:
        st.metric("🚀 Active", active, help="Initiatives currently in progress")
    with c2:
        st.metric("✅ Completed", completed, help="Completed initiatives YTD")
    with c3:
        st.metric("⚡ Cycle Time", f"{avg_cycle}d", help="Avg days from start to delivery")
    with c4:
        st.metric("💬 Avg CSAT", csat_display,
                  delta=csat_delta, delta_color="off",
                  help="Average satisfaction score across engagements")
    with c5:
        st.metric("🎯 Goals On Track", f"{goals_on_track} / 7", help="Visit the Goals tab to update")
    with c6:
        st.metric("📅 Sessions YTD", sessions_ytd, help="Consultation sessions year to date")


def render_consult_section():
    """Render consultation session metrics"""
    with st.expander("📅 CONSULTATION SESSIONS", expanded=True):
        consult_data = pd.DataFrame({
            'Week': ['2/23-3/1', '3/2-3/8', '3/9-3/15', '3/16-3/22', '3/23-3/29', '3/30-4/5', '4/6-4/12', '4/13-4/17'],
            'BD Sessions': [2, 1, 1, 1, 3, 2, 4, 4],
            'Program Sessions': [2, 4, 4, 4, 7, 3, 6, 3]
        })
        consult_data['Total'] = consult_data['BD Sessions'] + consult_data['Program Sessions']
        consult_data['Cumulative'] = consult_data['Total'].cumsum()
        
        current_week = consult_data.iloc[-1]
        prev_week = consult_data.iloc[-2]
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                label="Growth Sessions",
                value=int(current_week['BD Sessions']),
                delta=f"{int(current_week['BD Sessions'] - prev_week['BD Sessions']):+d} vs last week"
            )
        
        with col2:
            st.metric(
                label="Program Sessions", 
                value=int(current_week['Program Sessions']),
                delta=f"{int(current_week['Program Sessions'] - prev_week['Program Sessions']):+d} vs last week"
            )
        
        with col3:
            st.metric(
                label="This Week Total",
                value=int(current_week['Total'])
            )
        
        with col4:
            st.metric(
                label="Cumulative",
                value=int(current_week['Cumulative'])
            )
        
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            name='Growth',
            x=consult_data['Week'],
            y=consult_data['BD Sessions'],
            marker_color=PRIMARY
        ))
        
        fig.add_trace(go.Bar(
            name='Program',
            x=consult_data['Week'],
            y=consult_data['Program Sessions'],
            marker_color=PRIMARY_LIGHT
        ))
        
        fig.add_trace(go.Scatter(
            name='Cumulative',
            x=consult_data['Week'],
            y=consult_data['Cumulative'],
            mode='lines+markers',
            line=dict(color='#1E1470', width=3),
            marker=dict(size=8),
            yaxis='y2'
        ))
        
        fig.update_layout(
            **get_plotly_layout(),
            barmode='stack',
            yaxis=dict(title='Weekly Sessions', gridcolor='#F3F3F3'),
            yaxis2=dict(title='Cumulative', overlaying='y', side='right', gridcolor='#F3F3F3'),
            height=280
        )
        
        st.plotly_chart(fig, use_container_width=True)


def render_csat_section(csat_df):
    """Render CSAT score metrics"""
    with st.expander("⭐ CUSTOMER SATISFACTION", expanded=True):
        if csat_df is None or csat_df.empty:
            st.info("Upload CSAT data to see metrics.")
            return
        
        avg_csat = csat_df['CSAT (1-5)'].mean()
        response_count = len(csat_df)
        high_impact_count = len(csat_df[csat_df['Impact Rating'] == 'High'])
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                label="Average CSAT",
                value=f"{avg_csat:.1f} / 5",
                delta=f"{(avg_csat/5)*100:.0f}%"
            )
        
        with col2:
            st.metric(label="Responses", value=response_count)
        
        with col3:
            st.metric(label="High Impact", value=high_impact_count)
        
        if 'Category' in csat_df.columns:
            csat_by_cat = csat_df.groupby('Category').agg({
                'CSAT (1-5)': 'mean',
                'Initiative': 'count'
            }).reset_index()
            csat_by_cat.columns = ['Category', 'Avg CSAT', 'Count']
            
            fig = go.Figure()
            
            fig.add_trace(go.Bar(
                y=csat_by_cat['Category'],
                x=csat_by_cat['Avg CSAT'],
                orientation='h',
                marker_color=[PRIMARY if cat == 'Program' else '#6B5DD3' for cat in csat_by_cat['Category']],
                text=[f"{v:.1f} ({c} responses)" for v, c in zip(csat_by_cat['Avg CSAT'], csat_by_cat['Count'])],
                textposition='inside',
                textfont=dict(color='white', size=12, family='system-ui')
            ))
            
            fig.update_layout(
                **get_plotly_layout(),
                xaxis=dict(title='Average CSAT', range=[0, 5], gridcolor='#F3F3F3'),
                yaxis=dict(title=''),
                height=120
            )
            
            st.plotly_chart(fig, use_container_width=True)


def get_initiatives_data():
    """Get initiatives data from Jira or use real REAL_INITIATIVES data"""
    # Check if we have Jira configured
    if JIRA_AVAILABLE:
        try:
            client = get_jira_client()
            if client.is_configured():
                initiatives_df = client.get_initiatives()
                if not initiatives_df.empty:
                    return initiatives_df, True
        except Exception as e:
            st.warning(f"Could not fetch Jira data: {e}")
    
    # Return real initiative data
    sample_data = pd.DataFrame([
        {
            'key': item['key'],
            'summary': item['summary'],
            'status': item['status'],
            'business_unit': item['category'],
            'label': item['label'],
            'priority': item['priority'],
        }
        for item in REAL_INITIATIVES
    ])
    return sample_data, False


def render_initiatives_section():
    """Render Jira initiative metrics"""
    with st.expander("🚀 RIC INITIATIVES", expanded=True):
        initiatives_df, is_live = get_initiatives_data()
        
        # Map statuses for counting
        status_map = {
            'To Do': 'To Do',
            'Discovery': 'Discovery',
            'Ready For Prioritization': 'Ready',
            'Ready for Work': 'Ready',
            'Delivery / Execution': 'In Progress',
            'In Progress': 'In Progress',
            'Expansion / Scale': 'Scaling',
            'Always On': 'Always On',
            'Done': 'Done',
            'Blocked': 'Blocked'
        }
        
        initiatives_df['status_simple'] = initiatives_df['status'].map(lambda x: status_map.get(x, x))
        
        # Calculate metrics
        status_counts = initiatives_df['status_simple'].value_counts()
        bu_counts = initiatives_df['business_unit'].value_counts()
        
        total = len(initiatives_df)
        in_progress = status_counts.get('In Progress', 0) + status_counts.get('Scaling', 0)
        done = status_counts.get('Done', 0)
        discovery = status_counts.get('Discovery', 0)
        blocked = status_counts.get('Blocked', 0)
        
        # Status badge
        if is_live:
            st.markdown('<span style="background: #E1F5EE; color: #085041; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">LIVE DATA</span>', unsafe_allow_html=True)
        else:
            st.markdown('<span style="background: #FAEEDA; color: #633806; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">SAMPLE DATA</span>', unsafe_allow_html=True)
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(label="Total Initiatives", value=total)
        with col2:
            st.metric(label="In Progress", value=in_progress)
        with col3:
            st.metric(label="Completed", value=done)
        with col4:
            st.metric(label="Discovery", value=discovery)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("**By Status**")
            
            status_data = pd.DataFrame({
                'Status': list(status_counts.index),
                'Count': list(status_counts.values)
            })
            
            fig = go.Figure()
            
            colors = {
                'Discovery': '#9990E3',
                'In Progress': '#6B5DD3',
                'Scaling': '#4A3BC7',
                'Always On': '#3223BD',
                'Done': '#1E1470',
                'Blocked': '#E57373',
                'To Do': '#B8B5D1',
                'Ready': '#7B72C9'
            }
            
            fig.add_trace(go.Bar(
                y=status_data['Status'],
                x=status_data['Count'],
                orientation='h',
                marker_color=[colors.get(s, PRIMARY) for s in status_data['Status']],
                text=status_data['Count'],
                textposition='inside',
                textfont=dict(color='white', size=14, family='system-ui')
            ))
            
            fig.update_layout(
                **get_plotly_layout(),
                xaxis=dict(title='Count', gridcolor='#F3F3F3'),
                yaxis=dict(title='', tickangle=0),
                height=220
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.markdown("**By Sector**")
            
            bu_colors = {
                'Health': '#3223BD',
                'Civilian': '#6B5DD3',
                'DNS': '#1E1470',
                'Corporate': '#B8B5D1',
                'RIC': '#7B72C9',
                'BD/Growth': '#9990E3',
                'Other': '#9990E3'
            }
            
            bu_data = pd.DataFrame({
                'Business Unit': list(bu_counts.index),
                'Count': list(bu_counts.values)
            })
            
            fig = go.Figure()
            fig.add_trace(go.Bar(
                y=bu_data['Business Unit'],
                x=bu_data['Count'],
                orientation='h',
                marker_color=[bu_colors.get(bu, PRIMARY) for bu in bu_data['Business Unit']],
                text=bu_data['Count'],
                textposition='inside',
                textfont=dict(color='white', size=14, family='system-ui')
            ))
            
            fig.update_layout(
                **get_plotly_layout(),
                xaxis=dict(title='Count', gridcolor='#F3F3F3'),
                yaxis=dict(title='', tickangle=0),
                height=220
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with col3:
            st.markdown("**By Type**")
            
            label_colors = {
                'Program': '#3223BD',
                'BD/Growth': '#6B5DD3',
                'Corporate': '#B8B5D1',
                'RIC': '#7B72C9',
            }
            
            label_counts = initiatives_df['label'].value_counts()
            label_data = pd.DataFrame({
                'Type': list(label_counts.index),
                'Count': list(label_counts.values)
            })
            
            fig = go.Figure()
            fig.add_trace(go.Bar(
                y=label_data['Type'],
                x=label_data['Count'],
                orientation='h',
                marker_color=[label_colors.get(l, PRIMARY) for l in label_data['Type']],
                text=label_data['Count'],
                textposition='inside',
                textfont=dict(color='white', size=14, family='system-ui')
            ))
            
            fig.update_layout(
                **get_plotly_layout(),
                xaxis=dict(title='Count', gridcolor='#F3F3F3'),
                yaxis=dict(title='', tickangle=0),
                height=220
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        # Priority breakdown with donut chart
        st.markdown("---")
        st.markdown("**Priority & Progress Overview**")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            # Priority donut chart
            priority_counts = initiatives_df['priority'].value_counts()
            
            # Map colors to priority levels
            priority_color_map = {
                'Blocker': '#B71C1C',
                'Critical': '#E57373',
                'High': '#FF8A65',
                'Medium': '#FFB74D',
                'Low': '#81C784'
            }
            pie_colors = [priority_color_map.get(p, '#999') for p in priority_counts.index]
            
            fig = go.Figure(data=[go.Pie(
                labels=priority_counts.index,
                values=priority_counts.values,
                hole=0.5,
                marker_colors=pie_colors,
                textinfo='label+value',
                textposition='outside',
                textfont=dict(size=11, family='system-ui'),
                insidetextorientation='horizontal'
            )])
            
            fig.update_layout(
                **get_plotly_layout(),
                showlegend=False,
                height=220,
                annotations=[dict(text='Priority', x=0.5, y=0.5, font_size=12, showarrow=False)]
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Progress gauge
            completion_rate = (done / total * 100) if total > 0 else 0
            
            fig = go.Figure(go.Indicator(
                mode="gauge+number",
                value=completion_rate,
                number={'suffix': '%', 'font': {'size': 32, 'color': PRIMARY}},
                gauge={
                    'axis': {'range': [0, 100], 'tickwidth': 1},
                    'bar': {'color': PRIMARY},
                    'bgcolor': 'white',
                    'borderwidth': 0,
                    'steps': [
                        {'range': [0, 33], 'color': '#F3F3F3'},
                        {'range': [33, 66], 'color': '#E8E8E8'},
                        {'range': [66, 100], 'color': '#D9DCF8'}
                    ],
                    'threshold': {
                        'line': {'color': '#1E1470', 'width': 4},
                        'thickness': 0.75,
                        'value': completion_rate
                    }
                }
            ))
            
            fig.update_layout(
                **get_plotly_layout(),
                height=200,
            )
            
            st.plotly_chart(fig, use_container_width=True)
            st.caption("Completion Rate")
        
        with col3:
            # BU donut chart
            fig = go.Figure(data=[go.Pie(
                labels=bu_counts.index,
                values=bu_counts.values,
                hole=0.5,
                marker_colors=[bu_colors.get(bu, PRIMARY) for bu in bu_counts.index],
                textinfo='label+value',
                textposition='outside',
                textfont=dict(size=11, family='system-ui'),
                insidetextorientation='horizontal'
            )])
            
            fig.update_layout(
                **get_plotly_layout(),
                showlegend=False,
                height=220,
                annotations=[dict(text='BU', x=0.5, y=0.5, font_size=12, showarrow=False)]
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        # Show initiative list in expandable section
        with st.expander("View All Initiatives", expanded=False):
            # Create a styled table
            display_df = initiatives_df[['key', 'summary', 'status', 'business_unit', 'label', 'priority']].copy()
            display_df.columns = ['Key', 'Summary', 'Status', 'Sector', 'Type', 'Priority']
            st.dataframe(display_df, use_container_width=True, hide_index=True)
        
        if not is_live:
            st.caption("*Configure JIRA_EMAIL and JIRA_API_TOKEN environment variables for live data*")


def render_analytics_section():
    """Render the Initiative Performance tab with charts and KPIs derived from real RIC initiative data."""

    # -----------------------------------------------------------------------
    # Build DataFrames from module-level constants
    # -----------------------------------------------------------------------
    df = pd.DataFrame(REAL_INITIATIVES)
    df['created'] = pd.to_datetime(df['created'])
    df['completed'] = pd.to_datetime(df['completed'])

    snap_df = pd.DataFrame(WEEKLY_SNAPSHOTS)
    snap_df['week_start'] = pd.to_datetime(snap_df['week_start'])

    comp_df = pd.DataFrame(WEEKLY_COMPLETIONS)
    # Preserve ordering — assign a numeric index so charts stay in calendar order
    comp_df.index = range(len(comp_df))

    # -----------------------------------------------------------------------
    # Row 1 — Top KPI cards
    # -----------------------------------------------------------------------
    st.markdown("#### Initiative Overview")

    total_count = len(df)
    completed_count = int(df['status'].eq('Done').sum())
    completed_pct = round(completed_count / total_count * 100) if total_count else 0
    active_count = int(df['status'].eq('In Progress').sum())
    discovery_count = int(df['status'].eq('Discovery').sum())

    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.metric("Total Initiatives", total_count)
    with k2:
        st.metric("Completed", f"{completed_count} ({completed_pct}%)")
    with k3:
        st.metric("Active / In Progress", active_count)
    with k4:
        st.metric("In Discovery", discovery_count)

    st.markdown("---")

    # -----------------------------------------------------------------------
    # Row 2 — Completion timeline (2 side-by-side charts)
    # -----------------------------------------------------------------------
    st.markdown("#### Completion Timeline")

    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("**Weekly Completions**")

        weeks = comp_df['week'].tolist()
        weekly_vals = comp_df['completed'].tolist()
        cumulative_vals = comp_df['completed'].cumsum().tolist()

        fig = go.Figure()

        fig.add_trace(go.Bar(
            name='Completed This Week',
            x=weeks,
            y=weekly_vals,
            marker_color='#3223BD',
            yaxis='y'
        ))

        fig.add_trace(go.Scatter(
            name='Cumulative',
            x=weeks,
            y=cumulative_vals,
            mode='lines+markers',
            line=dict(color='#1E1470', width=2),
            marker=dict(size=6),
            yaxis='y2'
        ))

        fig.update_layout(
            **get_plotly_layout(),
            barmode='group',
            yaxis=dict(title='Weekly Completions', gridcolor='#F3F3F3', dtick=1),
            yaxis2=dict(
                title='Cumulative',
                overlaying='y',
                side='right',
                gridcolor='#F3F3F3',
                dtick=1
            ),
            height=300
        )

        st.plotly_chart(fig, use_container_width=True)

    with col_b:
        st.markdown("**Cumulative Completion Curve**")

        snap_weeks = snap_df['week'].tolist()
        done_cum = snap_df['done_cumulative'].tolist()

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            name='Done (Cumulative)',
            x=snap_weeks,
            y=done_cum,
            mode='lines',
            fill='tozeroy',
            fillcolor='#D9DCF8',
            line=dict(color='#3223BD', width=2),
        ))

        fig.update_layout(
            **get_plotly_layout(),
            yaxis=dict(title='Cumulative Completions', gridcolor='#F3F3F3', dtick=1),
            xaxis=dict(title='', gridcolor='#F3F3F3'),
            height=300
        )

        st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # -----------------------------------------------------------------------
    # Row 3 — Active engagement trends (full-width stacked area)
    # -----------------------------------------------------------------------
    st.markdown("#### Active Engagement Trends")

    snap_weeks = snap_df['week'].tolist()

    fig = go.Figure()

    # Stacked area layers (bottom to top)
    fig.add_trace(go.Scatter(
        name='Backlog',
        x=snap_weeks,
        y=snap_df['backlog'].tolist(),
        mode='lines',
        fill='tozeroy',
        fillcolor='#E0E0E0',
        line=dict(color='#E0E0E0', width=1),
        stackgroup='one'
    ))

    fig.add_trace(go.Scatter(
        name='Discovery',
        x=snap_weeks,
        y=snap_df['discovery'].tolist(),
        mode='lines',
        fill='tonexty',
        fillcolor='#9990E3',
        line=dict(color='#9990E3', width=1),
        stackgroup='one'
    ))

    fig.add_trace(go.Scatter(
        name='Always On',
        x=snap_weeks,
        y=snap_df['always_on'].tolist(),
        mode='lines',
        fill='tonexty',
        fillcolor='#6B5DD3',
        line=dict(color='#6B5DD3', width=1),
        stackgroup='one'
    ))

    fig.add_trace(go.Scatter(
        name='Active',
        x=snap_weeks,
        y=snap_df['active'].tolist(),
        mode='lines',
        fill='tonexty',
        fillcolor='#3223BD',
        line=dict(color='#3223BD', width=1),
        stackgroup='one'
    ))

    # Overlay: cumulative done on secondary y-axis
    fig.add_trace(go.Scatter(
        name='Done (Cumulative)',
        x=snap_weeks,
        y=snap_df['done_cumulative'].tolist(),
        mode='lines+markers',
        line=dict(color='#1E1470', width=2, dash='dot'),
        marker=dict(size=5),
        yaxis='y2'
    ))

    fig.update_layout(
        **get_plotly_layout(),
        yaxis=dict(title='Initiative Count', gridcolor='#F3F3F3'),
        yaxis2=dict(
            title='Cumulative Done',
            overlaying='y',
            side='right',
            gridcolor='#F3F3F3'
        ),
        height=360
    )

    st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # -----------------------------------------------------------------------
    # Row 4 — Category breakdown (by label)
    # -----------------------------------------------------------------------
    st.markdown("#### Category Breakdown")

    col_c, col_d = st.columns(2)

    STATUS_BUCKETS = {
        'Done':          ('Done',      '#2E7D32'),
        'In Progress':   ('Active',    '#3223BD'),
        'Always On':     ('Active',    '#3223BD'),
        'Discovery':     ('Discovery', '#9990E3'),
        'Ready for Work':('Backlog',   '#E0E0E0'),
        'To Do':         ('Backlog',   '#E0E0E0'),
        'Blocked':       ('Blocked',   '#E57373'),
    }
    BUCKET_COLORS = {
        'Done':      '#2E7D32',
        'Active':    '#3223BD',
        'Discovery': '#9990E3',
        'Backlog':   '#BDBDBD',
        'Blocked':   '#E57373',
    }
    BUCKET_ORDER = ['Done', 'Active', 'Discovery', 'Backlog', 'Blocked']

    # Build pivot: label x bucket -> count
    df['bucket'] = df['status'].map(lambda s: STATUS_BUCKETS.get(s, (s, '#999'))[0])
    label_order = ['Health', 'DNS', 'BD/Growth', 'Corporate', 'RIC', 'Civilian']

    with col_c:
        st.markdown("**By Label & Status**")

        pivot = (
            df.groupby(['label', 'bucket'])
            .size()
            .reset_index(name='count')
        )

        fig = go.Figure()

        for bucket in BUCKET_ORDER:
            bucket_data = pivot[pivot['bucket'] == bucket]
            # Ensure every label appears (fill 0 if missing)
            counts_by_label = {row['label']: row['count'] for _, row in bucket_data.iterrows()}
            y_vals = [counts_by_label.get(lbl, 0) for lbl in label_order]

            fig.add_trace(go.Bar(
                name=bucket,
                y=label_order,
                x=y_vals,
                orientation='h',
                marker_color=BUCKET_COLORS[bucket],
            ))

        fig.update_layout(
            **get_plotly_layout(),
            barmode='group',
            xaxis=dict(title='Count', gridcolor='#F3F3F3', dtick=1),
            yaxis=dict(title=''),
            height=320
        )

        st.plotly_chart(fig, use_container_width=True)

    with col_d:
        st.markdown("**Completion Rate by Label**")

        label_totals = df.groupby('label').size().rename('total')
        label_done = df[df['status'] == 'Done'].groupby('label').size().rename('done')
        rate_df = pd.concat([label_totals, label_done], axis=1).fillna(0)
        rate_df['pct'] = (rate_df['done'] / rate_df['total'] * 100).round(1)
        rate_df = rate_df.reset_index().sort_values('pct', ascending=True)

        # Purple gradient: map rank to shade
        n = len(rate_df)
        bar_colors = [
            f'rgba(50,35,189,{0.3 + 0.7 * (i / max(n - 1, 1)):.2f})'
            for i in range(n)
        ]

        fig = go.Figure()

        fig.add_trace(go.Bar(
            y=rate_df['label'].tolist(),
            x=rate_df['pct'].tolist(),
            orientation='h',
            marker_color=bar_colors,
            text=[f"{v:.0f}%" for v in rate_df['pct'].tolist()],
            textposition='outside',
            textfont=dict(size=12, family='system-ui')
        ))

        fig.update_layout(
            **get_plotly_layout(),
            xaxis=dict(title='% Completed', range=[0, 110], gridcolor='#F3F3F3'),
            yaxis=dict(title=''),
            height=320
        )

        st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # -----------------------------------------------------------------------
    # Row 5 — Category weekly trends (small multiples)
    # -----------------------------------------------------------------------
    st.markdown("#### Category Weekly Trends (Active Initiatives)")

    TREND_CATEGORIES = ['Health', 'DNS', 'BD/Growth', 'Corporate']
    snap_weeks_list = snap_df['week'].tolist()
    snap_starts = snap_df['week_start'].tolist()
    # Approximate week-end = week_start + 6 days
    snap_ends = [ws + timedelta(days=6) for ws in snap_starts]

    def active_count_for_category(cat_label, week_start, week_end):
        """Count initiatives active for a given label during a week window."""
        count = 0
        for item in REAL_INITIATIVES:
            if item['label'] != cat_label:
                continue
            created = pd.to_datetime(item['created'])
            completed = pd.to_datetime(item['completed']) if item['completed'] else None
            # Active if created on or before week_end AND (not completed OR completed >= week_start)
            if created <= week_end and (completed is None or completed >= week_start):
                count += 1
        return count

    trend_cols = st.columns(len(TREND_CATEGORIES))

    for col_idx, cat in enumerate(TREND_CATEGORIES):
        active_series = [
            active_count_for_category(cat, ws, we)
            for ws, we in zip(snap_starts, snap_ends)
        ]

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=snap_weeks_list,
            y=active_series,
            mode='lines+markers',
            line=dict(color='#3223BD', width=2),
            marker=dict(size=5),
            fill='tozeroy',
            fillcolor='rgba(50,35,189,0.08)'
        ))

        fig.update_layout(
            **get_plotly_layout(),
            title=dict(text=cat, font=dict(size=13), x=0),
            yaxis=dict(title='Active', gridcolor='#F3F3F3', dtick=1),
            xaxis=dict(title='', tickangle=-45, gridcolor='#F3F3F3'),
            height=200,
        )

        with trend_cols[col_idx]:
            st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # -----------------------------------------------------------------------
    # Row 6 — Completed initiatives table
    # -----------------------------------------------------------------------
    st.markdown("#### Completed Initiatives")

    completed_df = df[df['status'] == 'Done'].copy()
    completed_df['days_active'] = (completed_df['completed'] - completed_df['created']).dt.days
    completed_df = completed_df.sort_values('completed')

    table_df = completed_df[['key', 'summary', 'label', 'priority', 'completed', 'days_active']].copy()
    table_df.columns = ['Key', 'Initiative', 'Category', 'Priority', 'Completed Date', 'Days Active']
    table_df['Completed Date'] = table_df['Completed Date'].dt.strftime('%Y-%m-%d')

    PRIORITY_COLORS = {
        'Blocker':  'background-color: #FFEBEE; color: #B71C1C; font-weight: 700;',
        'Critical': 'background-color: #FFEBEE; color: #C62828; font-weight: 600;',
        'High':     'background-color: #FFF3E0; color: #E65100; font-weight: 600;',
        'Medium':   'background-color: #FFFDE7; color: #F57F17; font-weight: 500;',
        'Low':      'background-color: #F1F8E9; color: #33691E; font-weight: 500;',
    }

    def style_priority(val):
        return PRIORITY_COLORS.get(val, '')

    styled = (
        table_df.style
        .map(style_priority, subset=['Priority'])
        .set_properties(**{'text-align': 'left'})
    )

    st.dataframe(styled, use_container_width=True, hide_index=True)


def render_testimonials_content(csat_df):
    """Render testimonials content"""
    if csat_df is None or csat_df.empty:
        st.info("Upload CSAT data to see testimonials.")
        return
    
    testimonials = csat_df[csat_df['Testimonial'].notna() & (csat_df['Testimonial'] != '')]
    
    if testimonials.empty:
        st.info("No testimonials found in the data.")
        return
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Testimonials", len(testimonials))
    with col2:
        avg_csat = testimonials['CSAT (1-5)'].mean()
        st.metric("Average CSAT", f"{avg_csat:.1f} / 5")
    with col3:
        high_impact = len(testimonials[testimonials['Impact Rating'] == 'High'])
        st.metric("High Impact", high_impact)
    
    st.markdown("")
    
    col1, col2 = st.columns(2)
    with col1:
        category_filter = st.selectbox(
            "Filter by Category",
            options=['All'] + list(testimonials['Category'].unique()),
            index=0,
            key="testimonial_category"
        )
    with col2:
        impact_filter = st.selectbox(
            "Filter by Impact",
            options=['All'] + list(testimonials['Impact Rating'].unique()),
            index=0,
            key="testimonial_impact"
        )
    
    filtered = testimonials.copy()
    if category_filter != 'All':
        filtered = filtered[filtered['Category'] == category_filter]
    if impact_filter != 'All':
        filtered = filtered[filtered['Impact Rating'] == impact_filter]
    
    st.markdown("")
    
    for _, row in filtered.iterrows():
        quote = row['Testimonial']
        
        st.markdown(f"""
            <div class="testimonial-card">
                <div class="testimonial-quote">"{quote}"</div>
                <div class="testimonial-attribution">
                    — {row['Stakeholder']}, {row['Initiative']}
                </div>
                <div class="testimonial-meta">
                    {row['Date'].strftime('%b %d, %Y') if pd.notna(row['Date']) else ''} | 
                    <span class="status-badge status-{row['Impact Rating'].lower() if pd.notna(row['Impact Rating']) else 'medium'}">Impact: {row['Impact Rating']}</span> | 
                    CSAT: {int(row['CSAT (1-5)'])}/5
                </div>
            </div>
        """, unsafe_allow_html=True)


def render_integration_settings():
    """Render integration settings for Jira and Outlook"""
    st.markdown("---")
    st.markdown("### Integrations")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Jira Connection")
        
        if JIRA_AVAILABLE:
            client = get_jira_client()
            if client.is_configured():
                st.success("Jira is connected")
                st.markdown(f"**Server:** {client.config.base_url}")
                st.markdown(f"**Project:** {client.config.project_key}")
                
                if st.button("Test Connection", key="test_jira"):
                    try:
                        df = client.get_initiatives()
                        st.success(f"Connected! Found {len(df)} initiatives.")
                    except Exception as e:
                        st.error(f"Connection failed: {e}")
            else:
                st.warning("Jira not configured")
                st.markdown("""
                Set these environment variables:
                - `JIRA_EMAIL` - Your Atlassian email
                - `JIRA_API_TOKEN` - API token from Atlassian
                - `JIRA_BASE_URL` - (optional) Default: esimplicity.atlassian.net
                - `JIRA_PROJECT_KEY` - (optional) Default: RIC
                """)
        else:
            st.error("Jira client module not available")
    
    with col2:
        st.markdown("#### Outlook Calendar")

        # Initialize session state
        for key, default in {
            'outlook_client_id': os.getenv("OUTLOOK_CLIENT_ID", ""),
            'outlook_tenant_id': os.getenv("OUTLOOK_TENANT_ID", ""),
            'outlook_calendar_email': os.getenv("OUTLOOK_CALENDAR_EMAIL", ""),
            'outlook_access_token': None,
            'outlook_device_code': None,
            'outlook_user_code': None,
            'outlook_verification_uri': None,
            'outlook_polling': False,
        }.items():
            if key not in st.session_state:
                st.session_state[key] = default

        # If already authenticated, show status and disconnect option
        if st.session_state.outlook_access_token:
            st.success("✅ Connected to your Outlook calendar")
            st.caption(f"Reading calendar for: {st.session_state.get('outlook_calendar_email', 'your account')}")

            col_test2, col_disc = st.columns(2)
            with col_test2:
                if st.button("🔄 Test Calendar", key="test_cal_btn"):
                    import requests as _req
                    from datetime import datetime as _dt, timedelta as _td
                    start = (_dt.now() - _td(days=7)).strftime("%Y-%m-%dT00:00:00Z")
                    end = _dt.now().strftime("%Y-%m-%dT23:59:59Z")
                    try:
                        me_resp = _req.get(
                            "https://graph.microsoft.com/v1.0/me/calendar/events",
                            headers={"Authorization": f"Bearer {st.session_state.outlook_access_token}"},
                            params={
                                "$filter": f"start/dateTime ge '{start}' and end/dateTime le '{end}'",
                                "$select": "subject,start,categories",
                                "$top": 100
                            },
                            timeout=10
                        )
                        data = me_resp.json()
                        if "value" in data:
                            events = data["value"]
                            growth = sum(1 for e in events if "Growth" in e.get("categories", []))
                            program = sum(1 for e in events if "Program" in e.get("categories", []))
                            st.success(f"Found {len(events)} events — {growth} Growth, {program} Program")
                        else:
                            st.error("Calendar read failed:")
                            st.json(data)
                    except Exception as e:
                        st.error(f"Error: {e}")
            with col_disc:
                if st.button("🔌 Disconnect", key="disconnect_btn"):
                    st.session_state.outlook_access_token = None
                    st.session_state.outlook_device_code = None
                    st.session_state.outlook_polling = False
                    st.rerun()

        else:
            # Credential inputs (client_id and tenant_id only — no secret needed for device flow)
            with st.expander("⚙️ Azure App Settings", expanded=not bool(st.session_state.outlook_client_id)):
                st.caption("Only Client ID and Tenant ID are needed — no secret required for sign-in flow")
                new_client_id = st.text_input(
                    "Client ID",
                    value=st.session_state.outlook_client_id,
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                    key="ol_client_id_input"
                )
                new_tenant_id = st.text_input(
                    "Tenant ID",
                    value=st.session_state.outlook_tenant_id,
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                    key="ol_tenant_id_input"
                )
                if st.button("Save", key="save_ol_creds"):
                    st.session_state.outlook_client_id = new_client_id
                    st.session_state.outlook_tenant_id = new_tenant_id
                    st.success("Saved!")

            # Device flow login
            if st.session_state.outlook_client_id and st.session_state.outlook_tenant_id:

                if not st.session_state.outlook_polling:
                    if st.button("🔑 Sign in with Microsoft", key="start_device_flow", use_container_width=True):
                        import requests as _req
                        device_url = f"https://login.microsoftonline.com/{st.session_state.outlook_tenant_id}/oauth2/v2.0/devicecode"
                        resp = _req.post(device_url, data={
                            "client_id": st.session_state.outlook_client_id,
                            "scope": "Calendars.Read offline_access User.Read"
                        }, timeout=10)
                        ddata = resp.json()
                        if "user_code" in ddata:
                            st.session_state.outlook_device_code = ddata["device_code"]
                            st.session_state.outlook_user_code = ddata["user_code"]
                            st.session_state.outlook_verification_uri = ddata.get("verification_uri", "https://microsoft.com/devicelogin")
                            st.session_state.outlook_polling = True
                            st.rerun()
                        else:
                            st.error("Failed to start sign-in flow:")
                            st.json(ddata)
                            if ddata.get("error") == "unauthorized_client":
                                st.warning("💡 The Azure app needs 'Allow public client flows' enabled. In Azure Portal → App registrations → Authentication → toggle 'Allow public client flows' to Yes.")

                else:
                    # Show the code and poll for completion
                    st.markdown("### Sign in to Microsoft")
                    st.markdown(f"**1.** Open this link: [{st.session_state.outlook_verification_uri}]({st.session_state.outlook_verification_uri})")
                    st.markdown(f"**2.** Enter this code:")
                    st.code(st.session_state.outlook_user_code, language=None)
                    st.markdown("**3.** Sign in with your eSimplicity Microsoft account")
                    st.markdown("**4.** Click the button below once you've signed in:")

                    col_check, col_cancel = st.columns(2)
                    with col_check:
                        if st.button("✅ I've signed in — connect now", key="poll_token_btn", use_container_width=True):
                            import requests as _req
                            token_url = f"https://login.microsoftonline.com/{st.session_state.outlook_tenant_id}/oauth2/v2.0/token"
                            token_resp = _req.post(token_url, data={
                                "client_id": st.session_state.outlook_client_id,
                                "device_code": st.session_state.outlook_device_code,
                                "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
                            }, timeout=15)
                            tdata = token_resp.json()
                            if "access_token" in tdata:
                                st.session_state.outlook_access_token = tdata["access_token"]
                                st.session_state.outlook_polling = False
                                # Get the user's email
                                me = _req.get(
                                    "https://graph.microsoft.com/v1.0/me",
                                    headers={"Authorization": f"Bearer {tdata['access_token']}"},
                                    timeout=10
                                ).json()
                                st.session_state.outlook_calendar_email = me.get("mail") or me.get("userPrincipalName", "")
                                st.success(f"✅ Connected as {st.session_state.outlook_calendar_email}!")
                                st.rerun()
                            elif tdata.get("error") == "authorization_pending":
                                st.warning("Still waiting — haven't seen your sign-in yet. Complete the sign-in in your browser then try again.")
                            elif tdata.get("error") == "expired_token":
                                st.error("The code expired (15 min limit). Click cancel and start again.")
                            else:
                                st.error("Sign-in failed:")
                                st.json(tdata)
                    with col_cancel:
                        if st.button("✖ Cancel", key="cancel_device_flow", use_container_width=True):
                            st.session_state.outlook_polling = False
                            st.session_state.outlook_device_code = None
                            st.rerun()
            else:
                st.info("Enter your Azure App Client ID and Tenant ID above to enable calendar sign-in.")
                st.caption("Events tagged **'Growth'** → BD sessions · Events tagged **'Program'** → Program sessions")

def render_data_management(csat_df):
    """Render data management content"""
    st.markdown("### Upload Data")
    st.markdown("Upload CSAT survey results to update the dashboard metrics and testimonials.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        uploaded_file = st.file_uploader(
            "Upload CSAT Data (CSV)",
            type=['csv'],
            help="Upload a CSV with columns: Initiative, Stakeholder, Date, CSAT (1-5), Impact Rating, Category, Testimonial"
        )
        
        if uploaded_file is not None:
            try:
                df = pd.read_csv(uploaded_file, parse_dates=['Date'])
                st.session_state.csat_data = df
                st.success(f"Loaded {len(df)} records successfully!")
            except Exception as e:
                st.error(f"Error loading file: {e}")
    
    with col2:
        st.markdown("**Download Template**")
        st.markdown("Use this template to format your CSAT data correctly.")
        
        sample_data = pd.DataFrame({
            'Initiative': ['Example Initiative'],
            'Stakeholder': ['John Doe'],
            'Date': ['2026-03-23'],
            'CSAT (1-5)': [5],
            'Impact Rating': ['High'],
            'Category': ['Program'],
            'Testimonial': ['Great experience working with the RIC team!']
        })
        
        st.download_button(
            label="📥 Download CSV Template",
            data=sample_data.to_csv(index=False),
            file_name="csat_template.csv",
            mime="text/csv"
        )
    
    st.markdown("---")
    st.markdown("### Current Data")
    
    if csat_df is not None and not csat_df.empty:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Records", len(csat_df))
        with col2:
            st.metric("Date Range", f"{csat_df['Date'].min().strftime('%b %Y')} - {csat_df['Date'].max().strftime('%b %Y')}")
        with col3:
            st.metric("Categories", len(csat_df['Category'].unique()))
        
        with st.expander("Preview Data", expanded=False):
            st.dataframe(csat_df, use_container_width=True)
    else:
        st.info("No CSAT data loaded. Upload a CSV file to get started.")


def render_goals_section():
    """Render the 2026 SMART Goals Scorecard tab."""
    import datetime as dt

    today = dt.date.today()
    year_end = dt.date(2026, 12, 31)
    days_left = (year_end - today).days

    # -----------------------------------------------------------------------
    # Session-state defaults for manual entries
    # -----------------------------------------------------------------------
    ss_defaults = {
        'goals_g1_artifacts': 11,
        'goals_g1_csat_score': 0.0,
        'goals_g1_status': 'On Track',
        'goals_g2_advanced_programs': 1,
        'goals_g2_reusable_assets': 12,
        'goals_g2_status': 'On Track',
        'goals_g3_data_sources': 0,
        'goals_g3_launched': 'No',
        'goals_g3_usage_tracking': 'No',
        'goals_g3_status': 'At Risk',
        'goals_g4_intake_process': 'No',
        'goals_g4_avg_intake_days': 21,
        'goals_g4_status': 'At Risk',
        'goals_g5_demo_hit_rate': 60,
        'goals_g5_mentorship': 0,
        'goals_g5_status': 'On Track',
        'goals_g6_platforms_evaluated': 3,
        'goals_g6_platform_selected': 'No',
        'goals_g6_reference_impls': 0,
        'goals_g6_program_pilot': 'No',
        'goals_g6_status': 'At Risk',
        'goals_g7_foe_upskilled_pct': 0,
        'goals_g7_katalyst_upskilled_pct': 0,
        'goals_g7_foe_implemented': 'No',
        'goals_g7_katalyst_implemented': 'No',
        'goals_g7_status': 'Behind',
    }
    for key, val in ss_defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val

    # -----------------------------------------------------------------------
    # Auto-calculated values from REAL_INITIATIVES
    # -----------------------------------------------------------------------
    done_items = [i for i in REAL_INITIATIVES if i['completed']]
    # artifacts_delivered is manually tracked — not equal to Done initiative count
    artifacts_delivered = st.session_state.goals_g1_artifacts
    cycle_times = [
        (dt.date.fromisoformat(i['completed']) - dt.date.fromisoformat(i['created'])).days
        for i in done_items
    ]
    avg_cycle = sum(cycle_times) / len(cycle_times) if cycle_times else 0

    total_initiatives = len(REAL_INITIATIVES)  # = 29 (all are AI engagements)
    bd_growth_count = len([i for i in REAL_INITIATIVES if i['label'] == 'BD/Growth'])
    shine_item = next((i for i in REAL_INITIATIVES if i['key'] == 'RIC-340'), None)
    shine_status = shine_item['status'] if shine_item else 'Unknown'

    # -----------------------------------------------------------------------
    # Helper: progress bar figure
    # -----------------------------------------------------------------------
    def progress_fig(progress_pct):
        if progress_pct >= 75:
            color = '#085041'
        elif progress_pct >= 40:
            color = '#3223BD'
        else:
            color = '#E57373'
        fig = go.Figure(go.Bar(
            x=[progress_pct],
            y=['Progress'],
            orientation='h',
            marker_color=color,
            text=f"{progress_pct:.0f}%",
            textposition='inside',
            textfont=dict(color='white', size=16, family='system-ui')
        ))
        fig.update_layout(
            **get_plotly_layout(),
            xaxis=dict(range=[0, 100], showticklabels=False, showgrid=False),
            yaxis=dict(showticklabels=False),
            height=60,
            showlegend=False,
        )
        return fig

    # -----------------------------------------------------------------------
    # Header
    # -----------------------------------------------------------------------
    st.markdown("#### 🎯 2026 SMART Goals Scorecard")
    st.markdown(f"*Updated: {today.strftime('%B %d, %Y')}*")

    # -----------------------------------------------------------------------
    # Progress calculations (used for summary row)
    # -----------------------------------------------------------------------
    # G1
    artifact_pct = min(artifacts_delivered / 18 * 100, 100)
    cycle_pct = 100.0 if avg_cycle <= 28 else min(28 / avg_cycle * 100, 100)
    g1_csat = st.session_state.goals_g1_csat_score
    g1_progress = (artifact_pct + cycle_pct) / 2

    # G2
    ai_eng_pct = min(total_initiatives / 20 * 100, 100)
    g2_adv = st.session_state.goals_g2_advanced_programs
    g2_assets = st.session_state.goals_g2_reusable_assets
    g2_progress = (ai_eng_pct + min(g2_adv / 3 * 100, 100) + min(g2_assets / 75 * 100, 100)) / 3

    # G3
    g3_launched = st.session_state.goals_g3_launched
    g3_ds = st.session_state.goals_g3_data_sources
    g3_ut = st.session_state.goals_g3_usage_tracking
    g3_progress = (
        (40 if g3_launched == 'Yes' else 0)
        + min(g3_ds / 3 * 30, 30)
        + (30 if g3_ut == 'Yes' else 0)
    )

    # G4
    g4_intake = st.session_state.goals_g4_intake_process
    g4_days = st.session_state.goals_g4_avg_intake_days
    g4_intake_days_pct = 100.0 if g4_days <= 14 else min(14 / g4_days * 100, 100)
    g4_progress = (
        (33 if g4_intake == 'Yes' else 0)
        + g4_intake_days_pct * 0.33
        + 34  # pipeline always 100%
    )

    # G5
    g5_bd_pct = min(bd_growth_count / 10 * 100, 100)
    g5_demo = st.session_state.goals_g5_demo_hit_rate
    g5_mentor = st.session_state.goals_g5_mentorship
    g5_progress = (g5_bd_pct + min(g5_demo / 80 * 100, 100) + min(g5_mentor / 2 * 100, 100)) / 3

    # G6
    g6_plat = st.session_state.goals_g6_platforms_evaluated
    g6_sel = st.session_state.goals_g6_platform_selected
    g6_ref = st.session_state.goals_g6_reference_impls
    g6_pilot = st.session_state.goals_g6_program_pilot
    g6_progress = (
        min(g6_plat / 10 * 100, 100) * 0.25
        + (25 if g6_sel == 'Yes' else 0)
        + min(g6_ref / 4 * 100, 100) * 0.25
        + (25 if g6_pilot == 'Yes' else 0)
    )

    # G7
    g7_foe_up = st.session_state.goals_g7_foe_upskilled_pct
    g7_kat_up = st.session_state.goals_g7_katalyst_upskilled_pct
    g7_foe_impl = st.session_state.goals_g7_foe_implemented
    g7_kat_impl = st.session_state.goals_g7_katalyst_implemented
    g7_progress = (
        g7_foe_up
        + g7_kat_up
        + (100 if g7_foe_impl == 'Yes' else 0)
        + (100 if g7_kat_impl == 'Yes' else 0)
    ) / 4

    all_progresses = [g1_progress, g2_progress, g3_progress, g4_progress, g5_progress, g6_progress, g7_progress]
    avg_progress = sum(all_progresses) / len(all_progresses)
    goals_on_track = sum(1 for p in all_progresses if p >= 50)

    # -----------------------------------------------------------------------
    # Summary row
    # -----------------------------------------------------------------------
    sm1, sm2, sm3 = st.columns(3)
    with sm1:
        st.metric("Goals On Track (≥50%)", f"{goals_on_track} / 7")
    with sm2:
        st.metric("Avg Progress", f"{avg_progress:.0f}%")
    with sm3:
        st.metric("Days Left in 2026", days_left)

    st.markdown("---")

    # -----------------------------------------------------------------------
    # Goal 1 — Turn Ideas into Measurable Impact
    # -----------------------------------------------------------------------
    with st.expander("Goal 1 — Turn Ideas into Measurable Impact", expanded=False):
        st.markdown("**Target:** 18–24 artifacts delivered, CSAT ≥ 4.0, avg cycle time ≤ 4 weeks")
        st.markdown("")

        c1a, c1b, c1c = st.columns(3)
        with c1a:
            st.metric("Artifacts Delivered", f"{artifacts_delivered} of 18 min")
            st.session_state.goals_g1_artifacts = st.number_input(
                "Update artifact count",
                min_value=0, max_value=200, step=1,
                value=int(st.session_state.goals_g1_artifacts),
                key='goals_g1_artifacts_input',
                help="Prototypes, pilots, accelerators, write-ups, demos — any tangible deliverable"
            )
            st.caption("Manually tracked — update as artifacts are delivered")
        with c1b:
            st.metric("Avg Cycle Time", f"{avg_cycle:.1f} days", delta=f"target ≤ 28 days", delta_color="off")
            st.caption("auto-calculated from Jira")
        with c1c:
            csat_val = st.session_state.goals_g1_csat_score
            csat_display = f"{csat_val:.1f} / 5.0" if csat_val > 0 else "Upload CSAT data"
            st.metric("CSAT Score", csat_display, help="Enter below or upload CSAT CSV")
            st.session_state.goals_g1_csat_score = st.number_input(
                "Manual CSAT override (0 = use upload)",
                min_value=0.0, max_value=5.0, step=0.1,
                value=float(st.session_state.goals_g1_csat_score),
                key='goals_g1_csat_input',
                label_visibility='visible'
            )

        st.markdown("")
        st.markdown(f"**Progress:** artifact delivery {artifact_pct:.0f}% · cycle time {cycle_pct:.0f}% · combined **{g1_progress:.0f}%**")
        st.plotly_chart(progress_fig(g1_progress), use_container_width=True, key="goal1_progress_bar")

        st.session_state.goals_g1_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g1_status),
            key='goals_g1_status_sel'
        )

    # -----------------------------------------------------------------------
    # Goal 2 — Make AI a Force Multiplier
    # -----------------------------------------------------------------------
    with st.expander("Goal 2 — Make AI a Force Multiplier", expanded=False):
        st.markdown("**Target:** 20+ AI engagements, 3 programs at advanced AI, 75+ reusable assets")
        st.markdown("")

        c2a, c2b, c2c = st.columns(3)
        with c2a:
            st.metric("AI Engagements", total_initiatives, help="All RIC initiatives counted as AI engagements")
            st.caption("auto-calculated from Jira")
        with c2b:
            st.session_state.goals_g2_advanced_programs = st.number_input(
                "Programs at advanced AI stage", min_value=0, max_value=20, step=1,
                value=int(st.session_state.goals_g2_advanced_programs),
                key='goals_g2_adv_input'
            )
            st.caption(f"target: 3")
        with c2c:
            st.session_state.goals_g2_reusable_assets = st.number_input(
                "Reusable AI assets (prompts, agents, workflows)", min_value=0, max_value=500, step=1,
                value=int(st.session_state.goals_g2_reusable_assets),
                key='goals_g2_assets_input'
            )
            st.caption(f"target: 75")

        # Recalculate after widget update
        g2_adv = st.session_state.goals_g2_advanced_programs
        g2_assets = st.session_state.goals_g2_reusable_assets
        g2_progress = (ai_eng_pct + min(g2_adv / 3 * 100, 100) + min(g2_assets / 75 * 100, 100)) / 3

        st.markdown("")
        st.markdown(f"**Progress:** engagements {ai_eng_pct:.0f}% · advanced programs {min(g2_adv/3*100,100):.0f}% · assets {min(g2_assets/75*100,100):.0f}% · combined **{g2_progress:.0f}%**")
        st.plotly_chart(progress_fig(g2_progress), use_container_width=True, key="goal2_progress_bar")

        st.session_state.goals_g2_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g2_status),
            key='goals_g2_status_sel'
        )

    # -----------------------------------------------------------------------
    # Goal 3 — Unlock and Scale SHINE
    # -----------------------------------------------------------------------
    with st.expander("Goal 3 — Unlock and Scale SHINE", expanded=False):
        st.markdown("**Target:** Launch SHINE by Q3 2026, integrate 3 data sources, implement usage tracking")
        st.markdown("")

        c3a, c3b = st.columns(2)
        with c3a:
            st.metric("SHINE Initiative (RIC-340) Status", shine_status)
            st.caption("auto-calculated from Jira")
        with c3b:
            st.session_state.goals_g3_data_sources = st.number_input(
                "Data sources integrated", min_value=0, max_value=20, step=1,
                value=int(st.session_state.goals_g3_data_sources),
                key='goals_g3_ds_input'
            )
            st.caption("target: 3")

        c3c, c3d = st.columns(2)
        with c3c:
            st.session_state.goals_g3_launched = st.selectbox(
                "SHINE interface launched", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g3_launched),
                key='goals_g3_launched_sel'
            )
        with c3d:
            st.session_state.goals_g3_usage_tracking = st.selectbox(
                "Usage tracking implemented", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g3_usage_tracking),
                key='goals_g3_ut_sel'
            )

        # Recalculate
        g3_launched = st.session_state.goals_g3_launched
        g3_ds = st.session_state.goals_g3_data_sources
        g3_ut = st.session_state.goals_g3_usage_tracking
        g3_progress = (
            (40 if g3_launched == 'Yes' else 0)
            + min(g3_ds / 3 * 30, 30)
            + (30 if g3_ut == 'Yes' else 0)
        )

        st.markdown("")
        st.markdown(f"**Progress:** launched {40 if g3_launched=='Yes' else 0}/40 · data sources {min(g3_ds/3*30,30):.0f}/30 · tracking {30 if g3_ut=='Yes' else 0}/30 · combined **{g3_progress:.0f}%**")
        st.plotly_chart(progress_fig(g3_progress), use_container_width=True, key="goal3_progress_bar")

        st.session_state.goals_g3_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g3_status),
            key='goals_g3_status_sel'
        )

    # -----------------------------------------------------------------------
    # Goal 4 — Repeatable Innovation Engine
    # -----------------------------------------------------------------------
    with st.expander("Goal 4 — Repeatable Innovation Engine", expanded=False):
        st.markdown("**Target:** Standard intake process by Q2, weekly pipeline visibility, intake-to-consult ≤ 2 weeks")
        st.markdown("")

        c4a, c4b = st.columns(2)
        with c4a:
            st.metric("Weekly Pipeline Visibility", "✅ Active")
            st.caption("auto-calculated — this dashboard provides it")
            st.metric("Total Initiatives Tracked", total_initiatives)
            st.caption("auto-calculated from Jira")
        with c4b:
            st.session_state.goals_g4_intake_process = st.selectbox(
                "Standard intake process implemented", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g4_intake_process),
                key='goals_g4_intake_sel'
            )
            st.session_state.goals_g4_avg_intake_days = st.number_input(
                "Avg intake-to-consult time (days)", min_value=0, max_value=180, step=1,
                value=int(st.session_state.goals_g4_avg_intake_days),
                key='goals_g4_days_input'
            )
            st.caption("target: ≤ 14 days")

        # Recalculate
        g4_intake = st.session_state.goals_g4_intake_process
        g4_days = st.session_state.goals_g4_avg_intake_days
        g4_intake_days_pct = 100.0 if g4_days <= 14 else min(14 / max(g4_days, 1) * 100, 100)
        g4_progress = (
            (33 if g4_intake == 'Yes' else 0)
            + g4_intake_days_pct * 0.33
            + 34
        )

        st.markdown("")
        st.markdown(f"**Progress:** intake process {33 if g4_intake=='Yes' else 0}/33 · intake days {g4_intake_days_pct*0.33:.0f}/33 · pipeline 34/34 · combined **{g4_progress:.0f}%**")
        st.plotly_chart(progress_fig(g4_progress), use_container_width=True, key="goal4_progress_bar")

        st.session_state.goals_g4_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g4_status),
            key='goals_g4_status_sel'
        )

    # -----------------------------------------------------------------------
    # Goal 5 — Strengthen Technical Differentiation & Growth
    # -----------------------------------------------------------------------
    with st.expander("Goal 5 — Strengthen Technical Differentiation & Growth", expanded=False):
        st.markdown("**Target:** 10+ proposals/growth efforts supported, 80% demo hit rate, 2 mentorship completions")
        st.markdown("")

        c5a, c5b, c5c = st.columns(3)
        with c5a:
            st.metric("BD/Growth Initiatives", bd_growth_count, help="Initiatives with label BD/Growth")
            st.caption("auto-calculated from Jira")
        with c5b:
            st.session_state.goals_g5_demo_hit_rate = st.number_input(
                "Demo/artifact hit rate %", min_value=0, max_value=100, step=1,
                value=int(st.session_state.goals_g5_demo_hit_rate),
                key='goals_g5_demo_input'
            )
            st.caption("target: 80%")
        with c5c:
            st.session_state.goals_g5_mentorship = st.number_input(
                "Mentorship completions", min_value=0, max_value=20, step=1,
                value=int(st.session_state.goals_g5_mentorship),
                key='goals_g5_mentor_input'
            )
            st.caption("target: 2")

        # Recalculate
        g5_demo = st.session_state.goals_g5_demo_hit_rate
        g5_mentor = st.session_state.goals_g5_mentorship
        g5_progress = (g5_bd_pct + min(g5_demo / 80 * 100, 100) + min(g5_mentor / 2 * 100, 100)) / 3

        st.markdown("")
        st.markdown(f"**Progress:** BD/growth {g5_bd_pct:.0f}% · demo rate {min(g5_demo/80*100,100):.0f}% · mentorship {min(g5_mentor/2*100,100):.0f}% · combined **{g5_progress:.0f}%**")
        st.plotly_chart(progress_fig(g5_progress), use_container_width=True, key="goal5_progress_bar")

        st.session_state.goals_g5_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g5_status),
            key='goals_g5_status_sel'
        )

    # -----------------------------------------------------------------------
    # Goal 6 — Agentic AI Orchestration
    # -----------------------------------------------------------------------
    with st.expander("Goal 6 — Agentic AI Orchestration", expanded=False):
        st.markdown("**Target:** 10–12 platforms evaluated by Q2, select platform by mid-year, 4–6 reference implementations, 1 program pilot")
        st.markdown("")

        c6a, c6b = st.columns(2)
        with c6a:
            st.session_state.goals_g6_platforms_evaluated = st.number_input(
                "Platforms evaluated", min_value=0, max_value=20, step=1,
                value=int(st.session_state.goals_g6_platforms_evaluated),
                key='goals_g6_plat_input'
            )
            st.caption("target: 10")
            st.session_state.goals_g6_platform_selected = st.selectbox(
                "Platform selected & documented", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g6_platform_selected),
                key='goals_g6_sel_sel'
            )
        with c6b:
            st.session_state.goals_g6_reference_impls = st.number_input(
                "Reference implementations built", min_value=0, max_value=20, step=1,
                value=int(st.session_state.goals_g6_reference_impls),
                key='goals_g6_ref_input'
            )
            st.caption("target: 4")
            st.session_state.goals_g6_program_pilot = st.selectbox(
                "Program pilot adopted", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g6_program_pilot),
                key='goals_g6_pilot_sel'
            )

        # Recalculate
        g6_plat = st.session_state.goals_g6_platforms_evaluated
        g6_sel = st.session_state.goals_g6_platform_selected
        g6_ref = st.session_state.goals_g6_reference_impls
        g6_pilot = st.session_state.goals_g6_program_pilot
        g6_progress = (
            min(g6_plat / 10 * 100, 100) * 0.25
            + (25 if g6_sel == 'Yes' else 0)
            + min(g6_ref / 4 * 100, 100) * 0.25
            + (25 if g6_pilot == 'Yes' else 0)
        )

        st.markdown("")
        st.markdown(f"**Progress:** platforms {min(g6_plat/10*100,100):.0f}%×25% · selected {'✅' if g6_sel=='Yes' else '❌'} · ref impls {min(g6_ref/4*100,100):.0f}%×25% · pilot {'✅' if g6_pilot=='Yes' else '❌'} · combined **{g6_progress:.0f}%**")
        st.plotly_chart(progress_fig(g6_progress), use_container_width=True, key="goal6_progress_bar")

        st.session_state.goals_g6_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g6_status),
            key='goals_g6_status_sel'
        )

    # -----------------------------------------------------------------------
    # Goal 7 — (Stretch) Adopt FOE & Katalyst Practices
    # -----------------------------------------------------------------------
    with st.expander("Goal 7 (Stretch) — Adopt FOE & Katalyst Practices", expanded=False):
        st.markdown("**Target:** 100% team upskilled on FOE & Katalyst by Q3, implement both frameworks")
        st.markdown("")

        c7a, c7b = st.columns(2)
        with c7a:
            st.session_state.goals_g7_foe_upskilled_pct = st.number_input(
                "% team upskilled on FOE", min_value=0, max_value=100, step=1,
                value=int(st.session_state.goals_g7_foe_upskilled_pct),
                key='goals_g7_foe_up_input'
            )
            st.caption("target: 100%")
            st.session_state.goals_g7_foe_implemented = st.selectbox(
                "FOE implemented", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g7_foe_implemented),
                key='goals_g7_foe_impl_sel'
            )
        with c7b:
            st.session_state.goals_g7_katalyst_upskilled_pct = st.number_input(
                "% team upskilled on Katalyst", min_value=0, max_value=100, step=1,
                value=int(st.session_state.goals_g7_katalyst_upskilled_pct),
                key='goals_g7_kat_up_input'
            )
            st.caption("target: 100%")
            st.session_state.goals_g7_katalyst_implemented = st.selectbox(
                "Katalyst implemented", ["No", "Yes"],
                index=["No", "Yes"].index(st.session_state.goals_g7_katalyst_implemented),
                key='goals_g7_kat_impl_sel'
            )

        # Recalculate
        g7_foe_up = st.session_state.goals_g7_foe_upskilled_pct
        g7_kat_up = st.session_state.goals_g7_katalyst_upskilled_pct
        g7_foe_impl = st.session_state.goals_g7_foe_implemented
        g7_kat_impl = st.session_state.goals_g7_katalyst_implemented
        g7_progress = (
            g7_foe_up
            + g7_kat_up
            + (100 if g7_foe_impl == 'Yes' else 0)
            + (100 if g7_kat_impl == 'Yes' else 0)
        ) / 4

        st.markdown("")
        st.markdown(f"**Progress:** FOE upskill {g7_foe_up}% · Katalyst upskill {g7_kat_up}% · FOE impl {'✅' if g7_foe_impl=='Yes' else '❌'} · Katalyst impl {'✅' if g7_kat_impl=='Yes' else '❌'} · combined **{g7_progress:.0f}%**")
        st.plotly_chart(progress_fig(g7_progress), use_container_width=True, key="goal7_progress_bar")

        st.session_state.goals_g7_status = st.selectbox(
            "Status", ["On Track", "At Risk", "Behind", "Completed"],
            index=["On Track", "At Risk", "Behind", "Completed"].index(st.session_state.goals_g7_status),
            key='goals_g7_status_sel'
        )


def render_weekly_report():
    """Render the weekly report view with Slack-ready export"""
    st.markdown("### Weekly RIC Update")
    
    # Date range selector
    col1, col2 = st.columns([1, 3])
    with col1:
        report_date = st.date_input(
            "Week Ending",
            value=datetime.now(),
            help="Select the Friday of the report week"
        )
    
    week_start = report_date - timedelta(days=4)
    week_end = report_date
    
    st.markdown(f"**Report Period:** {week_start.strftime('%B %d')} - {week_end.strftime('%B %d, %Y')}")
    st.markdown("---")
    
    # Get data
    initiatives_df, is_live = get_initiatives_data()
    
    # Calculate metrics
    status_counts = initiatives_df['status'].value_counts()
    bu_counts = initiatives_df['business_unit'].value_counts()
    
    total = len(initiatives_df)
    in_progress_statuses = ['Delivery / Execution', 'Expansion / Scale', 'In Progress', 'Always On']
    in_progress = len(initiatives_df[initiatives_df['status'].isin(in_progress_statuses)])
    done = status_counts.get('Done', 0)
    
    # Metrics row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Active Initiatives", in_progress)
    with col2:
        st.metric("Completed", done)
    with col3:
        st.metric("Total Portfolio", total)
    with col4:
        st.metric("High Priority", len(initiatives_df[initiatives_df['priority'] == 'High']))
    
    st.markdown("---")
    
    # Key Accomplishments section
    st.markdown("#### Key Accomplishments This Week")
    
    accomplishments = st.text_area(
        "Enter key accomplishments (one per line)",
        value="IDR White Paper draft completed - on track for 5/1 delivery\nNTIA Spectrum demo rebuilt with full RF calculations\nNew consultation scheduling system deployed",
        height=100,
        key="accomplishments"
    )
    
    # Upcoming Priorities section
    st.markdown("#### Upcoming Priorities")
    
    priorities = st.text_area(
        "Enter upcoming priorities (one per line)",
        value="IDR White Paper final review and submission (5/1)\nNew Mexico RFP demo preparation (5/13)\nQ2 initiative planning kickoff",
        height=100,
        key="priorities"
    )
    
    # Blockers/Risks section
    st.markdown("#### Blockers & Risks")
    
    blockers = st.text_area(
        "Enter blockers or risks (one per line)",
        value="Resource constraint on Health initiatives\nAwaiting stakeholder feedback on VA Benefits Portal",
        height=80,
        key="blockers"
    )
    
    st.markdown("---")
    
    # Generate Slack-formatted report
    st.markdown("#### Export Options")
    
    # Build the Slack-formatted report
    slack_report = f"""*RIC Weekly Update | {week_start.strftime('%m/%d')} - {week_end.strftime('%m/%d/%Y')}*

*Portfolio Snapshot*
```
Metric          | Count
----------------|------
Active          | {in_progress:>5}
Completed       | {done:>5}
Total           | {total:>5}
High Priority   | {len(initiatives_df[initiatives_df['priority'] == 'High']):>5}
```

*By Business Unit*
```
Unit     | Count
---------|------"""
    
    for bu in ['Health', 'Civilian', 'DNS']:
        count = bu_counts.get(bu, 0)
        slack_report += f"\n{bu:<8} | {count:>5}"
    
    slack_report += f"""
```

*Key Accomplishments*
"""
    for line in accomplishments.strip().split('\n'):
        if line.strip():
            slack_report += f"- {line.strip()}\n"
    
    slack_report += f"""
*Upcoming Priorities*
"""
    for line in priorities.strip().split('\n'):
        if line.strip():
            slack_report += f"- {line.strip()}\n"
    
    if blockers.strip():
        slack_report += f"""
*Blockers & Risks*
"""
        for line in blockers.strip().split('\n'):
            if line.strip():
                slack_report += f"- {line.strip()}\n"
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.download_button(
            label="📋 Copy for Slack",
            data=slack_report,
            file_name=f"ric_weekly_{week_end.strftime('%Y%m%d')}.txt",
            mime="text/plain"
        )
    
    with col2:
        # CSV export of initiatives
        csv_data = initiatives_df.to_csv(index=False)
        st.download_button(
            label="📥 Export Initiatives CSV",
            data=csv_data,
            file_name=f"ric_initiatives_{week_end.strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )
    
    # Preview the Slack message
    with st.expander("Preview Slack Message", expanded=True):
        st.code(slack_report, language=None)


def render_initiative_drilldown():
    """Render initiative drill-down view"""
    st.markdown("### Initiative Details")
    
    initiatives_df, is_live = get_initiatives_data()
    
    # Initiative selector
    initiative_options = initiatives_df['key'] + ' - ' + initiatives_df['summary']
    selected = st.selectbox(
        "Select Initiative",
        options=initiative_options.tolist(),
        index=0
    )
    
    if selected:
        selected_key = selected.split(' - ')[0]
        initiative = initiatives_df[initiatives_df['key'] == selected_key].iloc[0]
        
        st.markdown("---")
        
        # Header with status
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"## {initiative['key']}")
            st.markdown(f"**{initiative['summary']}**")
        with col2:
            status_colors = {
                'Done': '#1E1470',
                'Delivery / Execution': '#3223BD',
                'In Progress': '#3223BD',
                'Discovery': '#6B5DD3',
                'Blocked': '#E57373',
                'Expansion / Scale': '#4A3BC7',
                'Always On': '#4A3BC7',
                'Ready for Work': '#7B72C9',
            }
            status_color = status_colors.get(initiative['status'], '#666')
            st.markdown(f"""
                <div style="background: {status_color}; color: white; padding: 8px 16px; 
                     border-radius: 8px; text-align: center; font-weight: 600;">
                    {initiative['status']}
                </div>
            """, unsafe_allow_html=True)
        
        # Details
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f"**Business Unit:** {initiative['business_unit']}")
        with col2:
            st.markdown(f"**Priority:** {initiative['priority']}")
        with col3:
            if is_live:
                st.markdown(f"**Jira:** [{initiative['key']}](https://esimplicity.atlassian.net/browse/{initiative['key']})")
            else:
                st.markdown(f"**Jira:** {initiative['key']}")
        
        st.markdown("---")
        
        # Placeholder for child epics (would come from Jira in live mode)
        st.markdown("#### Related Work Items")
        
        if is_live and JIRA_AVAILABLE:
            st.info("Connect to Jira to see related epics and stories.")
        else:
            # Sample child items
            child_items = pd.DataFrame({
                'Type': ['Epic', 'Epic', 'Story', 'Story', 'Story'],
                'Key': [f'{selected_key}-E1', f'{selected_key}-E2', f'{selected_key}-S1', f'{selected_key}-S2', f'{selected_key}-S3'],
                'Summary': ['Phase 1 Implementation', 'Phase 2 Rollout', 'User Research', 'UI Design', 'Backend API'],
                'Status': ['Done', 'In Progress', 'Done', 'In Progress', 'To Do']
            })
            
            st.dataframe(child_items, use_container_width=True, hide_index=True)
        
        # Activity section
        st.markdown("#### Recent Activity")
        st.info("Activity timeline will be available with Jira integration.")


def main():
    """Main application entry point"""
    csat_df = load_csat_data()
    
    # Render header
    render_header()
    
    # Navigation tabs
    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
        "📊 Dashboard",
        "📈 Initiative Performance",
        "🎯 Goals",
        "📋 Weekly Report",
        "🔍 Initiative Details",
        "💬 Testimonials",
        "⚙️ Settings"
    ])

    # Dashboard tab
    with tab1:
        render_kpi_summary(csat_df)

        st.markdown("---")

        col1, col2 = st.columns([1.3, 0.7])

        with col1:
            render_consult_section()

        with col2:
            render_csat_section(csat_df)

    # Initiative Performance tab
    with tab2:
        render_analytics_section()

    # Goals tab
    with tab3:
        render_goals_section()

    # Weekly Report tab
    with tab4:
        render_weekly_report()

    # Initiative Details tab
    with tab5:
        render_initiative_drilldown()

    # Testimonials tab
    with tab6:
        render_testimonials_content(csat_df)

    # Settings/Data management tab
    with tab7:
        render_data_management(csat_df)
        render_integration_settings()


if __name__ == "__main__":
    main()
