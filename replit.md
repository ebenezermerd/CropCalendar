# Crop Calendar Gantt Export Tool

## Project Overview
A full-stack application for processing agricultural crop data files and generating interactive Gantt charts with multiple export formats.

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: FastAPI + Python
- Database: SQLite (development)
- Deployment: Replit

## Features
- File upload and preview (CSV, XLSX, XML)
- Flexible column mapping and auto-detection
- Robust month/season parsing with month_mask
- Interactive Gantt chart visualization
- Multiple export formats:
  - Excel (.xlsx)
  - PNG/JPG (html2canvas client-side)
  - PDF (jsPDF client-side)
  - Custom LZL package (ZIP + metadata)
  - JSON

## Project Structure
```
├── backend/
│   ├── requirements.txt
│   └── app.py (FastAPI application)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── index.css
├── .gitignore
└── replit.md
```

## Setup Status
- [x] Project structure created
- [x] Backend configured (FastAPI on port 8000)
- [x] Frontend configured (Vite on port 5000)
- [ ] Dependencies installed
- [ ] Workflows configured
- [ ] Testing

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/upload` - Upload file
- `POST /api/upload/{upload_id}/map` - Map columns
- `GET /api/upload/{upload_id}/status` - Get upload status

## Next Steps
1. Install dependencies (Python backend + Node frontend)
2. Start workflows for development
3. Build frontend components (ColumnMapper, GanttView, ExportModal)
4. Implement parsing logic and export endpoints
5. Test with sample data
