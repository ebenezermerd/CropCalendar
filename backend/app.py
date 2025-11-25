from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
