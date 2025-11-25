from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import json
import sqlite3
import re
from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd

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

# --- SQLite bootstrap ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS uploads (
                upload_id TEXT PRIMARY KEY,
                filename TEXT,
                path TEXT,
                status TEXT,
                columns_json TEXT,
                created_at TEXT
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

# --- Month parsing helpers ---
MONTHS = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
}

def month_from_token(token: str) -> Optional[int]:
    token = token.lower().strip()
    if token in MONTHS:
        return MONTHS[token]
    try:
        m = int(token)
        if 1 <= m <= 12:
            return m
    except ValueError:
        pass
    return None

def parse_month_field(s: str) -> Dict:
    if not s or not isinstance(s, str):
        return {'months': [], 'mask': 0}
    
    s0 = s.lower()
    s0 = re.sub(r"\(.*?\)", "", s0)
    s0 = s0.replace('through', '-').replace('to', '-').replace('–', '-').replace('—', '-')
    
    if 'all year' in s0 or 'year-round' in s0 or 'throughout' in s0:
        months = list(range(1, 13))
    else:
        parts = re.split(r'[;,/]\s*', s0)
        months = []
        for p in parts:
            if '-' in p:
                toks = p.split('-', 1)
                a, b = toks[0].strip(), toks[1].strip()
                ma = month_from_token(a)
                mb = month_from_token(b)
                if ma and mb:
                    if ma <= mb:
                        months.extend(range(ma, mb + 1))
                    else:
                        months.extend(range(ma, 13))
                        months.extend(range(1, mb + 1))
            else:
                m = month_from_token(p.strip())
                if m:
                    months.append(m)
    
    months = sorted(list(set(months)))
    mask = 0
    for m in months:
        mask |= (1 << (m - 1))
    
    return {'months': months, 'mask': mask}

# --- API endpoints ---

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        upload_id = str(uuid.uuid4())
        file_path = os.path.join(DATA_DIR, f"{upload_id}_{file.filename}")
        
        # Save file
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Read first rows to get preview
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path, nrows=20)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, nrows=20)
        else:
            return {"error": "Unsupported file format"}, 400
        
        columns = df.columns.tolist()
        preview_rows = df.to_dict('records')
        
        # Store in DB
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""INSERT INTO uploads (upload_id, filename, path, status, columns_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                 (upload_id, file.filename, file_path, 'uploaded', json.dumps(columns), datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
        return {
            "upload_id": upload_id,
            "filename": file.filename,
            "columns": columns,
            "preview_rows": preview_rows[:5]
        }
    except Exception as e:
        return {"error": str(e)}, 500

@app.post("/api/upload/{upload_id}/map")
async def map_columns(upload_id: str, mapping: Dict):
    try:
        # This endpoint receives column mapping from frontend
        # Store and trigger parsing
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE uploads SET status = ? WHERE upload_id = ?", ('mapping_applied', upload_id))
        conn.commit()
        conn.close()
        return {"status": "mapping applied"}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/upload/{upload_id}/status")
def get_status(upload_id: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT status, columns_json FROM uploads WHERE upload_id = ?", (upload_id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return {"status": row[0], "columns": json.loads(row[1])}
        return {"error": "Upload not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
