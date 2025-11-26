from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
import json
import sqlite3
import re
import csv
import io
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import pandas as pd
import numpy as np

app = FastAPI()

# Enable CORS for Replit development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== REQUEST MODELS ====================

class FilterRequest(BaseModel):
    column_name: str
    values: List[str]

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
DB_FILE = os.path.join(DATA_DIR, "db.sqlite")

# ==================== DATABASE SETUP ====================

def init_db():
    """Initialize SQLite database with required tables"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute("""CREATE TABLE IF NOT EXISTS uploads (
                upload_id TEXT PRIMARY KEY,
                filename TEXT,
                path TEXT,
                status TEXT,
                columns_json TEXT,
                total_rows INTEGER,
                created_at TEXT,
                file_type TEXT
                )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                upload_id TEXT,
                row_number INTEGER,
                raw_json TEXT,
                normalized_json TEXT,
                month_mask INTEGER
                )""")
    
    conn.commit()
    conn.close()

init_db()

# ==================== COLUMN DETECTION HEURISTICS ====================

COLUMN_KEYWORDS = {
    'crop_name': [
        'crop', 'crop name', 'crop type', 'commodity', 'product', 'species',
        'plant', 'variety', 'cultivar', 'item', 'produce', 'culture'
    ],
    'country': [
        'country', 'nation', 'region', 'location', 'place', 'state', 'province',
        'area', 'zone', 'territory', 'land', 'country code', 'nation code'
    ],
    'season': [
        'season', 'period', 'phase', 'timing', 'cycle', 'growth', 'stage',
        'stage name', 'period name', 'season name'
    ],
    'harvest_calendar': [
        'harvest', 'harvest calendar', 'harvest period', 'harvest months',
        'harvest season', 'calendar', 'months', 'month', 'growing period',
        'growing months', 'season calendar', 'schedule', 'timing', 'duration',
        'date', 'dates', 'start', 'end', 'from', 'to', 'period', 'calendar period'
    ],
    'start_date': [
        'start', 'start date', 'from date', 'begin', 'begin date', 'commence',
        'start month', 'start date', 'sowing', 'planting', 'plantation'
    ],
    'end_date': [
        'end', 'end date', 'to date', 'finish', 'finish date', 'complete',
        'end month', 'harvest', 'harvest date', 'completion', 'deadline'
    ],
    'allYear': [
        'all year', 'allyear', 'year round', 'year-round', 'perennial', 'continuous',
        'all months', 'always', 'permanent', 'annual crop'
    ],
    'currentYear': [
        'year', 'current year', 'year data', 'data year', 'year reference', 'harvest year',
        'year identifier', 'year of', 'year value', 'season year'
    ]
}

MONTH_NAMES = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
}

def score_column_header(header: str, column_type: str) -> float:
    """
    Score how likely a column header matches a given column type.
    Returns a score 0.0-1.0
    """
    header_lower = header.lower().strip()
    keywords = COLUMN_KEYWORDS.get(column_type, [])
    
    max_score = 0.0
    
    # Exact match
    if header_lower in keywords:
        return 1.0
    
    # Contains keyword
    for keyword in keywords:
        if keyword in header_lower:
            score = len(keyword) / len(header_lower)
            max_score = max(max_score, score)
    
    # Partial match (Levenshtein-like simple check)
    for keyword in keywords:
        if header_lower.startswith(keyword) or keyword.startswith(header_lower):
            max_score = max(max_score, 0.7)
    
    return max_score

def detect_column_type(header: str, sample_values: List[str]) -> Optional[str]:
    """
    Auto-detect column type based on header name and sample values.
    Returns the detected type or None if uncertain.
    """
    scores = {}
    
    for col_type in COLUMN_KEYWORDS.keys():
        header_score = score_column_header(header, col_type)
        scores[col_type] = header_score
    
    # Additional heuristics based on sample values
    sample_text = " ".join(str(v).lower() for v in sample_values if v)
    
    # Check for month-like values
    month_count = sum(1 for month in MONTH_NAMES.keys() if month in sample_text)
    if month_count > 0:
        scores['harvest_calendar'] = min(1.0, scores['harvest_calendar'] + 0.3)
    
    # Check for numeric ranges (likely dates/months)
    if re.search(r'\d+\s*-\s*\d+', sample_text):
        scores['harvest_calendar'] = min(1.0, scores['harvest_calendar'] + 0.2)
        scores['start_date'] = min(1.0, scores['start_date'] + 0.15)
        scores['end_date'] = min(1.0, scores['end_date'] + 0.15)
    
    # Find top match
    if scores:
        top_type = max(scores, key=scores.get)
        top_score = scores[top_type]
        
        # Return only if confidence is high enough
        if top_score > 0.3:
            return top_type
    
    return None

def get_sample_values(df: pd.DataFrame, column: str, n: int = 5) -> List[str]:
    """Get first n non-null values from a column"""
    values = df[column].dropna().unique()[:n]
    return [str(v) for v in values]

def auto_detect_columns(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """
    Auto-detect column types for all columns in dataframe.
    Returns dict: {column_name: detected_type}
    """
    detected = {}
    
    for column in df.columns:
        sample_values = get_sample_values(df, column)
        col_type = detect_column_type(column, sample_values)
        detected[column] = col_type
    
    return detected

# ==================== FILE HANDLING ====================

def read_file_to_dataframe(file_path: str) -> Tuple[pd.DataFrame, str]:
    """
    Read CSV, XLSX, or XML file into pandas DataFrame.
    Returns (dataframe, file_type)
    """
    file_lower = file_path.lower()
    
    try:
        if file_lower.endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
            return df, 'csv'
        elif file_lower.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, dtype=str, keep_default_na=False)
            return df, 'excel'
        elif file_lower.endswith('.xml'):
            # Basic XML parsing
            import xml.etree.ElementTree as ET
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            rows = []
            for child in root:
                row = {}
                for element in child:
                    row[element.tag] = element.text or ''
                rows.append(row)
            
            if rows:
                df = pd.DataFrame(rows)
                return df, 'xml'
            else:
                raise ValueError("No data found in XML file")
        else:
            raise ValueError(f"Unsupported file type: {file_lower}")
    except Exception as e:
        raise ValueError(f"Failed to read file: {str(e)}")

# ==================== API ENDPOINTS ====================

@app.get("/api/health")
def health():
    """Health check endpoint"""
    return {"status": "ok"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file and return preview with auto-detected columns.
    
    Response:
    {
        "upload_id": "uuid",
        "filename": "example.csv",
        "file_type": "csv",
        "total_rows": 1000,
        "columns": ["col1", "col2", ...],
        "preview_rows": [{"col1": "val1", ...}, ...],
        "detected_columns": {
            "col1": "crop_name",
            "col2": "country",
            ...
        }
    }
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Save uploaded file
        upload_id = str(uuid.uuid4())
        file_path = os.path.join(DATA_DIR, f"{upload_id}_{file.filename}")
        
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Read file into dataframe
        df, file_type = read_file_to_dataframe(file_path)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Get columns
        columns = df.columns.tolist()
        
        # Get preview (first 10 rows)
        preview_df = df.head(10)
        preview_rows = preview_df.fillna("").to_dict('records')
        
        # Auto-detect columns
        detected_columns = auto_detect_columns(df)
        
        # Store in database
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""INSERT INTO uploads 
                    (upload_id, filename, path, status, columns_json, total_rows, created_at, file_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                 (upload_id, file.filename, file_path, 'uploaded', json.dumps(columns), 
                  len(df), datetime.now().isoformat(), file_type))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "upload_id": upload_id,
            "filename": file.filename,
            "file_type": file_type,
            "total_rows": len(df),
            "columns": columns,
            "preview_rows": preview_rows,
            "detected_columns": detected_columns
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }, 500

@app.get("/api/upload/{upload_id}")
def get_upload_info(upload_id: str):
    """Get information about an upload"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""SELECT filename, status, columns_json, total_rows, file_type, created_at 
                    FROM uploads WHERE upload_id = ?""", (upload_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        return {
            "upload_id": upload_id,
            "filename": row[0],
            "status": row[1],
            "columns": json.loads(row[2]),
            "total_rows": row[3],
            "file_type": row[4],
            "created_at": row[5]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upload/{upload_id}/preview")
def get_preview(upload_id: str, rows: int = 20):
    """Get extended preview of uploaded file"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT path, columns_json FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path = row[0]
        columns = json.loads(row[1])
        
        # Read file and get preview
        df, _ = read_file_to_dataframe(file_path)
        preview_df = df.head(min(rows, len(df)))
        preview_rows = preview_df.fillna("").to_dict('records')
        
        return {
            "rows": preview_rows,
            "count": len(preview_rows),
            "total": len(df),
            "columns": columns
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/{upload_id}/detect-columns")
def redetect_columns(upload_id: str):
    """Re-run column detection"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT path, columns_json FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path = row[0]
        
        # Read and detect
        df, _ = read_file_to_dataframe(file_path)
        detected_columns = auto_detect_columns(df)
        
        return {
            "detected_columns": detected_columns
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upload/{upload_id}/column-mapping")
def get_column_mapping_ui(upload_id: str, rows: int = 20):
    """
    Get data for column mapping UI with auto-detected types and confidence scores.
    
    Returns:
    {
        "columns": [
            {
                "name": "Crop",
                "detected_type": "crop_name",
                "confidence": 0.95,
                "sample_values": ["Wheat", "Corn", "Rice"]
            },
            ...
        ],
        "preview_rows": [first 20 rows of data],
        "total_rows": 1000
    }
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT path, columns_json, total_rows FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path, columns_json, total_rows = row
        columns_list = json.loads(columns_json)
        
        # Read file
        df, _ = read_file_to_dataframe(file_path)
        
        # Auto-detect with confidence scores
        column_info = []
        for col in columns_list:
            sample_values = get_sample_values(df, col, n=3)
            
            # Calculate confidence for each type
            scores = {}
            for col_type in COLUMN_KEYWORDS.keys():
                header_score = score_column_header(col, col_type)
                scores[col_type] = header_score
            
            # Add value-based heuristics
            sample_text = " ".join(str(v).lower() for v in sample_values if v)
            month_count = sum(1 for month in MONTH_NAMES.keys() if month in sample_text)
            if month_count > 0:
                scores['harvest_calendar'] = min(1.0, scores['harvest_calendar'] + 0.3)
            
            if re.search(r'\d+\s*-\s*\d+', sample_text):
                scores['harvest_calendar'] = min(1.0, scores['harvest_calendar'] + 0.2)
                scores['start_date'] = min(1.0, scores['start_date'] + 0.15)
                scores['end_date'] = min(1.0, scores['end_date'] + 0.15)
            
            detected_type = max(scores, key=scores.get) if scores else None
            confidence = round(max(scores.values()) if scores else 0.0, 2)
            
            column_info.append({
                "name": col,
                "detected_type": detected_type if confidence > 0.3 else None,
                "confidence": confidence,
                "sample_values": sample_values
            })
        
        # Get preview rows
        preview_df = df.head(min(rows, len(df)))
        preview_rows = preview_df.fillna("").to_dict('records')
        
        return {
            "columns": column_info,
            "preview_rows": preview_rows,
            "total_rows": total_rows,
            "available_types": list(COLUMN_KEYWORDS.keys()) + ["ignore"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/{upload_id}/save-mappings")
def save_column_mappings(upload_id: str, mappings: Dict[str, str]):
    """
    Save user-configured column mappings.
    
    Request body:
    {
        "Crop": "crop_name",
        "Country": "country",
        "Sowing_Month": "start_date",
        "Harvest_Month": "end_date",
        "Unknown_Column": "ignore"
    }
    
    Returns saved mappings and ready status.
    """
    try:
        # Validate mappings
        valid_types = set(COLUMN_KEYWORDS.keys()) | {"ignore"}
        for col, col_type in mappings.items():
            if col_type not in valid_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid column type '{col_type}'. Must be one of: {', '.join(valid_types)}"
                )
        
        # Store mappings in database
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Check if upload exists
        c.execute("SELECT upload_id FROM uploads WHERE upload_id = ?", (upload_id,))
        if not c.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Upload not found")
        
        # Update uploads table with column mappings
        c.execute("""UPDATE uploads SET columns_json = ? WHERE upload_id = ?""",
                 (json.dumps(mappings), upload_id))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "upload_id": upload_id,
            "mappings": mappings,
            "message": "Column mappings saved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PARSING & NORMALIZATION ====================

def extract_month_from_date(date_str: str) -> Optional[int]:
    """
    Extract month number from a date string.
    Handles: MM/DD/YYYY, DD-MM-YY, MM-DD-YYYY, etc.
    Returns month number (1-12) or None if can't parse
    """
    if not date_str or pd.isna(date_str):
        return None
    
    date_str = str(date_str).strip()
    
    # Try parsing with common date formats
    for fmt in ['%m/%d/%Y', '%m/%d/%y', '%d-%m-%y', '%d-%m-%Y', '%m-%d-%Y', '%m-%d-%y', 
                '%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d', '%d.%m.%Y', '%d.%m.%y']:
        try:
            parsed_date = datetime.strptime(date_str, fmt)
            return parsed_date.month
        except:
            continue
    
    # If date parsing fails, try to extract just the month
    # Look for MM in MM/DD or MM-DD patterns
    month_match = re.search(r'^(\d{1,2})(?:[/-]|$)', date_str)
    if month_match:
        try:
            month = int(month_match.group(1))
            if 1 <= month <= 12:
                return month
        except:
            pass
    
    return None

def parse_month_string(value: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Tuple[int, bool, str]:
    """
    Parse month/season information and return (month_mask, requires_review, parsed_months).
    
    Priority:
    1. If start_date and end_date are provided, use them for precise month extraction
    2. Otherwise parse the period/value string (Jan-Mar, 3-5, All year, etc.)
    
    month_mask: 12-bit integer where bit i=1 means month i is active
    """
    if not value or pd.isna(value):
        return 0, True, "unknown"
    
    value = str(value).strip().lower()
    
    # PRIORITY 1: Use actual start_date and end_date if available
    if start_date and end_date:
        start_month = extract_month_from_date(start_date)
        end_month = extract_month_from_date(end_date)
        
        if start_month and end_month:
            month_mask = 0
            parsed_months = []
            
            # Handle wraparound (e.g., Oct-Feb crossing year boundary)
            if start_month <= end_month:
                for m in range(start_month, end_month + 1):
                    month_mask |= (1 << (m - 1))
                    parsed_months.append(m)
            else:
                # Wraparound (e.g., Oct=10 to Feb=2)
                for m in range(start_month, 13):
                    month_mask |= (1 << (m - 1))
                    parsed_months.append(m)
                for m in range(1, end_month + 1):
                    month_mask |= (1 << (m - 1))
                    parsed_months.append(m)
            
            # Generate month names string
            month_names_list = []
            for m in sorted(set(parsed_months)):
                for name, num in MONTH_NAMES.items():
                    if num == m and len(name) >= 3:
                        month_names_list.append(name.capitalize())
                        break
            parsed_months_str = ", ".join(month_names_list)
            
            return month_mask, False, parsed_months_str
    
    # PRIORITY 2: Parse the period string
    # Check for "all year" / perennial indicators (but NOT just "12")
    if any(x in value for x in ['all year', 'allyear', 'year round', 'year-round', 'perennial', 'permanent', 'annual crop']):
        return 4095, False, "all year"  # 111111111111 in binary
    
    month_mask = 0
    requires_review = False
    parsed_months = []
    
    # Try range patterns with dates (e.g., "Jan 01 to Feb 28", "Mar 15 - Apr 15")
    # This pattern handles month names even when followed by dates
    date_range_patterns = [
        r'([a-z]{3,})\s+\d+\s*(?:to|-|through)\s*([a-z]{3,})\s+\d+',  # "Jan 01 to Feb 28"
        r'([a-z]{3,})\s*(?:to|-|through)\s*([a-z]{3,})',  # "Jan to Feb"
        r'(\d+)\s*(?:to|-|through)\s*(\d+)',  # "3 to 5"
    ]
    
    for pattern in date_range_patterns:
        match = re.search(pattern, value, re.IGNORECASE)
        if match:
            start_str, end_str = match.groups()
            
            # Try to convert to month numbers
            start_month = None
            end_month = None
            
            # Check if they're month names
            start_month = MONTH_NAMES.get(start_str.lower()[:3], None)
            end_month = MONTH_NAMES.get(end_str.lower()[:3], None)
            
            # If not month names, try numeric
            if not start_month:
                try:
                    start_month = int(start_str)
                    if start_month > 12:
                        start_month = None
                except:
                    pass
            
            if not end_month:
                try:
                    end_month = int(end_str)
                    if end_month > 12:
                        end_month = None
                except:
                    pass
            
            if start_month and end_month:
                # Handle wraparound (e.g., Oct-Feb)
                if start_month <= end_month:
                    for m in range(start_month, end_month + 1):
                        month_mask |= (1 << (m - 1))
                        if m not in parsed_months:
                            parsed_months.append(m)
                else:
                    # Wraparound
                    for m in range(start_month, 13):
                        month_mask |= (1 << (m - 1))
                        if m not in parsed_months:
                            parsed_months.append(m)
                    for m in range(1, end_month + 1):
                        month_mask |= (1 << (m - 1))
                        if m not in parsed_months:
                            parsed_months.append(m)
                break
    
    # Try individual month patterns (e.g., "Jan", "May", "Aug")
    if month_mask == 0:
        individual_months = re.findall(r'\b([a-z]{3,})\b', value)
        for month_str in individual_months:
            month_num = MONTH_NAMES.get(month_str.lower()[:3], None)
            if month_num:
                month_mask |= (1 << (month_num - 1))
                if month_num not in parsed_months:
                    parsed_months.append(month_num)
    
    # Generate month names string
    if parsed_months:
        month_names_list = []
        for m in sorted(set(parsed_months)):
            for name, num in MONTH_NAMES.items():
                if num == m and len(name) >= 3:
                    month_names_list.append(name.capitalize())
                    break
        parsed_months_str = ", ".join(month_names_list)
    else:
        parsed_months_str = "unparseable"
        requires_review = True
    
    return month_mask, requires_review, parsed_months_str

@app.post("/api/upload/{upload_id}/parse")
def parse_and_normalize_data(upload_id: str):
    """
    Parse entire file with configured column mappings.
    Extract month information and generate month_mask.
    Flag rows requiring manual review.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Get upload and mappings
        c.execute(
            "SELECT path, columns_json, total_rows FROM uploads WHERE upload_id = ?",
            (upload_id,)
        )
        row = c.fetchone()
        
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path, mappings_json, total_rows = row
        mappings = json.loads(mappings_json)
        
        # Read file
        df, _ = read_file_to_dataframe(file_path)
        
        # Parse records
        parsed_records = []
        stats = {
            'total_parsed': 0,
            'successful': 0,
            'manual_review': 0,
            'errors': 0
        }
        
        for idx, raw_row in df.iterrows():
            try:
                # Build normalized record
                normalized = {}
                requires_review = False
                review_reason = None
                
                # Find all relevant columns
                start_date_col = None
                end_date_col = None
                harvest_calendar_col = None
                season_col = None
                period_col = 'period' if 'period' in df.columns else None  # Always try period as fallback
                
                for col_name, col_type in mappings.items():
                    if col_type == 'start_date':
                        start_date_col = col_name
                    elif col_type == 'end_date':
                        end_date_col = col_name
                    elif col_type == 'harvest_calendar':
                        harvest_calendar_col = col_name
                    elif col_type == 'season':
                        season_col = col_name
                
                for col_name, col_type in mappings.items():
                    if col_type == 'ignore':
                        continue
                    
                    value = raw_row.get(col_name)
                    
                    # Handle month/period parsing
                    if col_type == 'harvest_calendar' or col_type == 'season':
                        # Try to use start_date and end_date for more accurate parsing
                        start_date = None
                        end_date = None
                        
                        if start_date_col:
                            start_date = raw_row.get(start_date_col)
                        if end_date_col:
                            end_date = raw_row.get(end_date_col)
                        
                        month_mask, needs_review, parsed_months = parse_month_string(value, start_date, end_date)
                        normalized['month_mask'] = month_mask
                        normalized['parsed_months'] = parsed_months
                        if needs_review:
                            requires_review = True
                            review_reason = f"Could not parse: {value}"
                    
                    elif col_type not in ['start_date', 'end_date']:  # Skip storing raw date columns
                        normalized[col_type] = str(value) if pd.notna(value) else None
                
                # If month_mask is 0 (parse failed), try period column as fallback
                if (normalized.get('month_mask') is None or normalized.get('month_mask') == 0) and period_col:
                    period_value = raw_row.get(period_col)
                    start_date = raw_row.get(start_date_col) if start_date_col else None
                    end_date = raw_row.get(end_date_col) if end_date_col else None
                    
                    month_mask, needs_review, parsed_months = parse_month_string(period_value, start_date, end_date)
                    
                    # Only update if we successfully parsed something (month_mask > 0)
                    if month_mask > 0:
                        normalized['month_mask'] = month_mask
                        normalized['parsed_months'] = parsed_months
                        requires_review = False  # Clear the review flag if fallback succeeded
                        review_reason = None
                    elif month_mask == 0 and needs_review:
                        # Fallback also failed to parse
                        normalized['month_mask'] = month_mask
                        normalized['parsed_months'] = parsed_months
                        requires_review = True
                        review_reason = f"Could not parse period: {period_value}"
                
                # Store record
                record_data = {
                    'row_number': idx + 1,
                    'requires_review': requires_review,
                    'review_reason': review_reason,
                    **normalized
                }
                parsed_records.append(record_data)
                
                # Store in database
                c.execute("""
                    INSERT INTO records (upload_id, row_number, raw_json, month_mask)
                    VALUES (?, ?, ?, ?)
                """, (
                    upload_id,
                    idx + 1,
                    json.dumps(dict(raw_row)),
                    normalized.get('month_mask', 0)
                ))
                
                stats['total_parsed'] += 1
                if requires_review:
                    stats['manual_review'] += 1
                else:
                    stats['successful'] += 1
                    
            except Exception as e:
                stats['errors'] += 1
                continue
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "upload_id": upload_id,
            "stats": stats,
            "sample_records": parsed_records[:5],
            "message": f"Parsed {stats['total_parsed']} records"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GROUP SELECTION & FILTERING ====================

@app.get("/api/upload/{upload_id}/group-columns")
def get_group_columns(upload_id: str):
    """
    Get list of available columns for grouping/filtering.
    Returns columns with their data types and unique value counts.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Get file path
        c.execute("SELECT path FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path = row[0]
        df, _ = read_file_to_dataframe(file_path)
        
        # Get columns with unique counts
        columns_info = []
        for col in df.columns:
            unique_count = df[col].nunique()
            columns_info.append({
                "name": col,
                "unique_values": unique_count,
                "type": str(df[col].dtype)
            })
        
        conn.close()
        return {
            "upload_id": upload_id,
            "columns": columns_info
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upload/{upload_id}/unique-values/{column_name}")
def get_unique_values(upload_id: str, column_name: str):
    """
    Get all unique values for a specific column.
    Returns sorted list with counts.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        c.execute("SELECT path FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path = row[0]
        df, _ = read_file_to_dataframe(file_path)
        
        if column_name not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{column_name}' not found")
        
        # Get unique values with counts
        value_counts = df[column_name].value_counts().reset_index()
        value_counts.columns = ['value', 'count']
        unique_values = value_counts.sort_values('value').to_dict('records')
        
        conn.close()
        return {
            "upload_id": upload_id,
            "column": column_name,
            "unique_values": unique_values,
            "total_unique": len(unique_values)
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/{upload_id}/filter")
def apply_filter(upload_id: str, filter_req: FilterRequest):
    """
    Apply filter to get matching records.
    ONLY RETURNS HARVESTING RECORDS - sowing/planting data is excluded.
    
    Request body:
    {
        "column_name": "Crop",
        "values": ["Sesame", "Wheat"]
    }
    
    Returns filtered records with their parsed data (harvesting only).
    """
    try:
        column_name = filter_req.column_name
        selected_values = filter_req.values
        
        if not column_name or not selected_values:
            raise HTTPException(status_code=400, detail="Missing column_name or values")
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Get upload and mappings
        c.execute(
            "SELECT path, columns_json FROM uploads WHERE upload_id = ?",
            (upload_id,)
        )
        row = c.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Upload not found")
        
        file_path, mappings_json = row
        mappings = json.loads(mappings_json) if mappings_json else {}
        
        # Read and filter data
        df, _ = read_file_to_dataframe(file_path)
        
        if column_name not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{column_name}' not found")
        
        # Filter to matching rows
        filtered_df = df[df[column_name].isin(selected_values)]
        
        # Filter to ONLY harvesting records - exclude sowing/planting
        cropprocess_cols = [col for col in filtered_df.columns if 'cropprocess' in col.lower() or 'crop_process' in col.lower()]
        if cropprocess_cols:
            cropprocess_col = cropprocess_cols[0]
            filtered_df = filtered_df[
                filtered_df[cropprocess_col].str.lower().str.contains('harvesting', na=False)
            ]
        
        # Get parsed records from database if available
        c.execute("""
            SELECT row_number, normalized_json, month_mask FROM records
            WHERE upload_id = ?
        """, (upload_id,))
        parsed_rows = {row[0]: (json.loads(row[1]) if row[1] else {}, row[2]) for row in c.fetchall()}
        
        # Build result records
        result_records = []
        for idx, df_row in filtered_df.iterrows():
            record = dict(df_row)
            row_num = idx + 1
            
            # Include parsed data if available
            if row_num in parsed_rows:
                parsed, month_mask = parsed_rows[row_num]
                record['parsed_data'] = parsed
                record['month_mask'] = month_mask
            
            result_records.append(record)
        
        conn.close()
        
        return {
            "success": True,
            "upload_id": upload_id,
            "filter": {
                "column": column_name,
                "values": selected_values
            },
            "total_records": len(result_records),
            "records": result_records
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upload/{upload_id}")
def get_upload_details(upload_id: str):
    """Get upload details for loading from history"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute(
            "SELECT upload_id, filename, file_type, total_rows, path, columns_json FROM uploads WHERE upload_id = ?",
            (upload_id,)
        )
        row = c.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        columns_json = row[5]
        columns = json.loads(columns_json) if columns_json else {}
        
        return {
            "success": True,
            "upload_id": row[0],
            "filename": row[1],
            "file_type": row[2],
            "total_rows": row[3],
            "path": row[4],
            "columns": list(columns.keys()) if isinstance(columns, dict) else []
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/upload/{upload_id}")
def delete_upload(upload_id: str):
    """Delete a single upload and its associated data"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Get file path to delete from filesystem
        c.execute("SELECT path FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        
        if row and os.path.exists(row[0]):
            os.remove(row[0])
        
        # Delete records and upload
        c.execute("DELETE FROM records WHERE upload_id = ?", (upload_id,))
        c.execute("DELETE FROM uploads WHERE upload_id = ?", (upload_id,))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Upload deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/delete-uploads")
def delete_multiple_uploads(ids: dict):
    """Delete multiple uploads at once"""
    try:
        upload_ids = ids.get("ids", [])
        if not upload_ids:
            raise HTTPException(status_code=400, detail="No IDs provided")
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Delete files from filesystem
        for upload_id in upload_ids:
            c.execute("SELECT path FROM uploads WHERE upload_id = ?", (upload_id,))
            row = c.fetchone()
            if row and os.path.exists(row[0]):
                os.remove(row[0])
            
            # Delete records and upload
            c.execute("DELETE FROM records WHERE upload_id = ?", (upload_id,))
            c.execute("DELETE FROM uploads WHERE upload_id = ?", (upload_id,))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "deleted": len(upload_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upload-history")
def get_upload_history(limit: int = 20):
    """Get list of recent uploads for history view"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""SELECT upload_id, filename, file_type, total_rows, created_at, status
                    FROM uploads 
                    ORDER BY created_at DESC 
                    LIMIT ?""", (limit,))
        rows = c.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                "upload_id": row[0],
                "filename": row[1],
                "file_type": row[2],
                "total_rows": row[3],
                "created_at": row[4],
                "status": row[5]
            })
        
        return {
            "success": True,
            "history": history,
            "total": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
