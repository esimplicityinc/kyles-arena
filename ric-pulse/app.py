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

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from styles.theme import (
    PRIMARY, PRIMARY_LIGHT, PRIMARY_VERY_LIGHT,
    TEXT_BLACK, TEXT_DARK_GRAY,
    SUCCESS_GREEN, SUCCESS_GREEN_BG,
    WARNING_AMBER, WARNING_AMBER_BG,
    CHART_COLORS, CUSTOM_CSS, get_plotly_layout
)

# Page configuration
st.set_page_config(
    page_title="RIC Pulse",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Enhanced CSS with top navigation and hero
ENHANCED_CSS = CUSTOM_CSS + """
<style>
    /* Hide default sidebar */
    [data-testid="stSidebar"] {
        display: none;
    }
    
    /* Page title styling */
    .page-title {
        font-size: 2rem;
        font-weight: 700;
        color: #3223BD;
        margin-bottom: 0.5rem;
    }
    
    /* Hero section */
    .hero-section {
        background: linear-gradient(135deg, #EEEDFE 0%, #D9DCF8 100%);
        border-radius: 16px;
        padding: 1.5rem 2rem;
        margin-bottom: 1.5rem;
        border-left: 4px solid #3223BD;
    }
    
    .hero-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #3223BD;
        margin-bottom: 0.5rem;
    }
    
    .hero-text {
        font-size: 0.95rem;
        color: #444441;
        line-height: 1.6;
        margin: 0;
    }
    
    .hero-stats {
        display: flex;
        gap: 2rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #D9DCF8;
    }
    
    .hero-stat {
        text-align: center;
    }
    
    .hero-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #3223BD;
    }
    
    .hero-stat-label {
        font-size: 0.75rem;
        color: #444441;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 0;
        background: #F3F3F3;
        border-radius: 8px;
        padding: 4px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        border-radius: 6px;
        padding: 8px 24px;
        font-weight: 600;
        color: #444441;
    }
    
    .stTabs [aria-selected="true"] {
        background: #3223BD !important;
        color: white !important;
    }
    
    /* Improved metric styling */
    [data-testid="stMetricValue"] {
        font-size: 2rem !important;
        font-weight: 700 !important;
        color: #1C1C1C !important;
    }
    
    [data-testid="stMetricLabel"] {
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.3px !important;
        color: #444441 !important;
    }
    
    /* Expander styling for sections */
    .stExpander {
        background: #FFFFFF;
        border: 1px solid #E0E0E0 !important;
        border-radius: 16px !important;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(50, 35, 189, 0.06);
    }
    
    .stExpander > details {
        border: none !important;
    }
    
    .stExpander > details > summary {
        font-size: 1.1rem;
        font-weight: 700;
        color: #3223BD;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Data management section */
    .data-section {
        background: #F9F9F9;
        border-radius: 12px;
        padding: 1rem 1.5rem;
        margin-top: 1rem;
    }
</style>
"""

st.markdown(ENHANCED_CSS, unsafe_allow_html=True)


def load_csat_data():
    """Load CSAT data from session state or sample file"""
    if 'csat_data' in st.session_state and st.session_state.csat_data is not None:
        return st.session_state.csat_data
    
    sample_path = os.path.join(os.path.dirname(__file__), 'data', 'sample_csat.csv')
    if os.path.exists(sample_path):
        return pd.read_csv(sample_path, parse_dates=['Date'])
    
    return None


def render_header_and_nav():
    """Render the page title and top navigation"""
    # Title row
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown('<div class="page-title">RIC Pulse</div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f"<div style='text-align: right; color: #999; font-size: 0.85rem; padding-top: 0.75rem;'>Last updated: {datetime.now().strftime('%b %d, %Y')}</div>", unsafe_allow_html=True)
    
    # Navigation tabs
    tab1, tab2, tab3 = st.tabs(["📊 Dashboard", "💬 Testimonials", "⚙️ Data"])
    
    return tab1, tab2, tab3


def render_hero(csat_df):
    """Render the hero/intro section explaining RIC Pulse"""
    # Calculate some stats for the hero
    total_sessions = 53  # From consult data cumulative
    avg_csat = csat_df['CSAT (1-5)'].mean() if csat_df is not None and not csat_df.empty else 0
    total_initiatives = 26  # Placeholder
    
    st.markdown(f"""
        <div class="hero-section">
            <div class="hero-title">Welcome to the Rapid Innovation Center</div>
            <p class="hero-text">
                RIC Pulse tracks the impact and activity of eSimplicity's Rapid Innovation Center. 
                We partner with Growth and Program teams to accelerate solutions through rapid prototyping, 
                technical consulting, and innovation workshops. This dashboard provides real-time visibility 
                into our consultation sessions, customer satisfaction scores, and active initiatives.
            </p>
            <div class="hero-stats">
                <div class="hero-stat">
                    <div class="hero-stat-value">{total_sessions}</div>
                    <div class="hero-stat-label">Sessions YTD</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value">{avg_csat:.1f}/5</div>
                    <div class="hero-stat-label">Avg CSAT</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value">{total_initiatives}</div>
                    <div class="hero-stat-label">Initiatives</div>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)


def render_consult_section():
    """Render consultation session metrics"""
    with st.expander("📅 CONSULTATION SESSIONS", expanded=True):
        # Sample data - will be replaced with Outlook calendar data
        consult_data = pd.DataFrame({
            'Week': ['2/23-3/1', '3/2-3/8', '3/9-3/15', '3/16-3/22', '3/23-3/29', '3/30-4/5', '4/6-4/12', '4/13-4/17'],
            'BD Sessions': [2, 1, 1, 1, 3, 2, 4, 4],
            'Program Sessions': [2, 4, 4, 4, 7, 3, 6, 3]
        })
        consult_data['Total'] = consult_data['BD Sessions'] + consult_data['Program Sessions']
        consult_data['Cumulative'] = consult_data['Total'].cumsum()
        
        current_week = consult_data.iloc[-1]
        prev_week = consult_data.iloc[-2]
        
        # Metrics row
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
        
        # Trend chart
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
            height=320
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
            st.metric(
                label="Responses",
                value=response_count
            )
        
        with col3:
            st.metric(
                label="High Impact",
                value=high_impact_count
            )
        
        # CSAT by category - horizontal bar chart
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
                height=150
            )
            
            st.plotly_chart(fig, use_container_width=True)


def render_initiatives_section():
    """Render Jira initiative metrics"""
    with st.expander("🚀 RIC INITIATIVES", expanded=True):
        # Placeholder data - will be replaced with Jira API data
        status_data = pd.DataFrame({
            'Status': ['Discovery', 'In Progress', 'Done', 'Blocked'],
            'Count': [5, 8, 12, 1],
            'Color': [PRIMARY, WARNING_AMBER, SUCCESS_GREEN, '#991B1B']
        })
        
        bu_data = pd.DataFrame({
            'Business Unit': ['Health', 'Civilian', 'DNS'],
            'Count': [8, 4, 8]  # DNS = Defense + Intelligence combined
        })
        
        # Top metrics row
        total = sum(status_data['Count'])
        in_progress = status_data[status_data['Status'] == 'In Progress']['Count'].values[0]
        done = status_data[status_data['Status'] == 'Done']['Count'].values[0]
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(label="Total Initiatives", value=total)
        with col2:
            st.metric(label="In Progress", value=in_progress)
        with col3:
            st.metric(label="Completed", value=done)
        with col4:
            st.metric(label="Avg Cycle Time", value="14 days")
        
        st.markdown("")  # Spacer
        
        # Charts row
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**By Status**")
            
            # Horizontal bar chart for status - eSimplicity purple palette
            fig = go.Figure()
            
            # eSimplicity brand colors - purple variations
            colors = {
                'Discovery': '#6B5DD3',      # Lighter purple
                'In Progress': '#3223BD',    # Primary purple
                'Done': '#1E1470',           # Dark purple
                'Blocked': '#9990E3'         # Muted purple
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
                yaxis=dict(title='', categoryorder='array', categoryarray=['Blocked', 'Discovery', 'In Progress', 'Done'], tickangle=0),
                height=220
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.markdown("**By Business Unit**")
            
            fig = go.Figure()
            
            # eSimplicity brand colors - purple variations
            bu_colors = {
                'Health': '#3223BD',         # Primary purple
                'Civilian': '#6B5DD3',       # Lighter purple
                'DNS': '#1E1470'             # Dark purple
            }
            
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
        
        st.caption("*Data will be pulled from Jira API when configured*")


def render_testimonials_content(csat_df):
    """Render testimonials content"""
    if csat_df is None or csat_df.empty:
        st.info("Upload CSAT data to see testimonials.")
        return
    
    testimonials = csat_df[csat_df['Testimonial'].notna() & (csat_df['Testimonial'] != '')]
    
    if testimonials.empty:
        st.info("No testimonials found in the data.")
        return
    
    # Summary at top
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Testimonials", len(testimonials))
    with col2:
        avg_csat = testimonials['CSAT (1-5)'].mean()
        st.metric("Average CSAT", f"{avg_csat:.1f} / 5")
    with col3:
        high_impact = len(testimonials[testimonials['Impact Rating'] == 'High'])
        st.metric("High Impact", high_impact)
    
    st.markdown("")  # Spacer
    
    # Filter options
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
    
    # Apply filters
    filtered = testimonials.copy()
    if category_filter != 'All':
        filtered = filtered[filtered['Category'] == category_filter]
    if impact_filter != 'All':
        filtered = filtered[filtered['Impact Rating'] == impact_filter]
    
    st.markdown("")  # Spacer
    
    # Display testimonials
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
    
    # Show current data summary
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
        
        # Show data preview
        with st.expander("Preview Data", expanded=False):
            st.dataframe(csat_df, use_container_width=True)
    else:
        st.info("No CSAT data loaded. Upload a CSV file to get started.")


def main():
    """Main application entry point"""
    csat_df = load_csat_data()
    
    # Render header and get navigation tabs
    tab1, tab2, tab3 = render_header_and_nav()
    
    # Dashboard tab
    with tab1:
        render_hero(csat_df)
        
        # Top row - Consults and CSAT side by side
        col1, col2 = st.columns([1.3, 0.7])
        
        with col1:
            render_consult_section()
        
        with col2:
            render_csat_section(csat_df)
        
        # Bottom row - Initiatives (full width)
        render_initiatives_section()
    
    # Testimonials tab
    with tab2:
        render_testimonials_content(csat_df)
    
    # Data management tab
    with tab3:
        render_data_management(csat_df)


if __name__ == "__main__":
    main()
