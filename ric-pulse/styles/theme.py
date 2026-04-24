"""
RIC Pulse - eSimplicity Theme
Color palette and styling constants
"""

# Primary Colors
PRIMARY = "#3223BD"           # Twilight purple
PRIMARY_LIGHT = "#D9DCF8"     # Light purple
PRIMARY_VERY_LIGHT = "#EEEDFE" # Very light purple

# Text Colors
TEXT_BLACK = "#1C1C1C"
TEXT_DARK_GRAY = "#444441"
TEXT_LIGHT_GRAY = "#999999"

# Background Colors
BG_WHITE = "#FFFFFF"
BG_LIGHT_GRAY = "#F3F3F3"

# Status Colors
SUCCESS_GREEN = "#085041"
SUCCESS_GREEN_BG = "#E1F5EE"
WARNING_AMBER = "#633806"
WARNING_AMBER_BG = "#FAEEDA"

# Chart Colors
CHART_COLORS = [
    PRIMARY,          # Purple
    "#EE3D2C",        # Databricks red
    SUCCESS_GREEN,    # Green
    WARNING_AMBER,    # Amber
    "#6B7280",        # Gray
]

# Streamlit custom CSS
CUSTOM_CSS = """
<style>
    /* Main app styling */
    .stApp {
        background-color: #FFFFFF;
    }
    
    /* Header styling */
    .main-header {
        background: linear-gradient(135deg, #3223BD 0%, #4A3BC7 100%);
        color: white;
        padding: 1.5rem 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
    }
    
    .main-header h1 {
        color: white !important;
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
    }
    
    .main-header p {
        color: rgba(255,255,255,0.8);
        margin: 0.5rem 0 0 0;
        font-size: 0.9rem;
    }
    
    /* Metric cards */
    .metric-card {
        background: #FFFFFF;
        border: 1px solid #E0E0E0;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(50, 35, 189, 0.08);
    }
    
    .metric-card:hover {
        box-shadow: 0 4px 16px rgba(50, 35, 189, 0.12);
    }
    
    .metric-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #3223BD;
        margin-bottom: 0.5rem;
    }
    
    .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1C1C1C;
    }
    
    .metric-subtext {
        font-size: 0.85rem;
        color: #444441;
        margin-top: 0.5rem;
    }
    
    /* Section headers */
    .section-header {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1C1C1C;
        padding-bottom: 0.75rem;
        border-bottom: 3px solid #3223BD;
        margin-bottom: 1.5rem;
    }
    
    /* Testimonial cards */
    .testimonial-card {
        background: #EEEDFE;
        border-left: 4px solid #3223BD;
        border-radius: 0 12px 12px 0;
        padding: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .testimonial-quote {
        font-size: 1rem;
        color: #444441;
        font-style: italic;
        line-height: 1.6;
        margin-bottom: 1rem;
    }
    
    .testimonial-attribution {
        font-size: 0.85rem;
        color: #3223BD;
        font-weight: 600;
    }
    
    .testimonial-meta {
        font-size: 0.75rem;
        color: #444441;
        margin-top: 0.25rem;
    }
    
    /* Status badges */
    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
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
        color: #444441;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Custom tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background-color: #F3F3F3;
        border-radius: 8px;
        padding: 8px 16px;
    }
    
    .stTabs [aria-selected="true"] {
        background-color: #3223BD !important;
        color: white !important;
    }
</style>
"""

def get_plotly_layout():
    """Return consistent Plotly layout settings"""
    return dict(
        font=dict(family="system-ui, -apple-system, sans-serif", color=TEXT_BLACK),
        paper_bgcolor=BG_WHITE,
        plot_bgcolor=BG_WHITE,
        margin=dict(l=40, r=40, t=40, b=40),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
