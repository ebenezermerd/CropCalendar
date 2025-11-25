# Crop Calendar Gantt Export Tool

### Overview
The Crop Calendar Gantt Export Tool is a professional-grade application designed to process agricultural data, visualize crop seasonality, and prepare it for export. It streamlines the workflow from raw file upload to interactive Gantt chart visualization, focusing on robust data parsing, intelligent column mapping, and flexible filtering. The tool aims to provide a clear, interactive overview of crop planting, growing, and harvesting periods, enabling detailed analysis and future export capabilities.

### User Preferences
No explicit user preferences were provided in the original `replit.md` file.

### System Architecture
The application follows a client-server architecture.
- **Frontend**: Built with React, Vite, and Tailwind CSS, it provides a professional, responsive user interface with a multi-step workflow. Key UI/UX decisions include drag-and-drop interfaces, color-coded data previews, interactive Gantt charts with zoom and tooltips, and a clean, modern design.
- **Backend**: Implemented with FastAPI and Uvicorn, handling data processing, column auto-detection, parsing, and filtering logic.
- **Database**: SQLite is used for storing upload metadata, user-configured mappings, and normalized parsed records.

**Core Features and Design Decisions:**
- **File Handling**: Supports CSV, XLSX, XLS, and XML formats with validation for type and size (50MB limit).
- **Intelligent Auto-Detection & Column Mapping**: Server-side auto-detection identifies 9 column types (agricultural + temporal) using keyword matching and value analysis with confidence scoring. Users can customize mappings via an interactive UI.
- **Robust Parsing & Normalization**: Extracts month/season information (e.g., "Jan-Mar", "3-5", "All year") and generates 12-bit month masks for efficient querying. Manual review flags assist with unparseable values.
- **Group Selection & Filtering**: Allows users to filter data by any column, offering fuzzy search, bulk selection, and presentation of both raw and parsed results.
- **Interactive Gantt View with Dynamic Columns**:
    - **Table-based layout**: Each grouping field gets its own dedicated column (Country | Period | CropProcess | months...)
    - **Dynamic month expansion**: Automatically expands columns to fit longest data span (12-24 months)
    - **Year wrapping labels**: Months beyond year 1 labeled as "Jan Y+1", "Feb Y+1", etc.
    - **Resizable columns**: Drag column borders to adjust month widths dynamically
    - **Multi-column grouping**: Users can select multiple columns to create hierarchical groupings (Country + Period + Crop)
    - **CropProcess sorting**: Dropdown to group by Planting → Growing → Harvesting sequence
    - **Visual rectangles**: Generated from month masks with color-coding and year-end wrapping
    - **Date range tooltips**: Hover shows actual dates (e.g., "Jan 02 - Feb 26")
    - **Inline editing**: Click bars to edit month masks

### External Dependencies
- **Frontend**:
    - `React`: JavaScript library for building user interfaces.
    - `Vite`: Frontend build tool.
    - `Tailwind CSS`: Utility-first CSS framework.
    - `Axios`: Promise-based HTTP client.
    - `Sonner`: Toast notification library.
    - `html2canvas`, `jsPDF`, `XLSX`: (Planned for future export functionality).
- **Backend**:
    - `FastAPI`: Web framework for building APIs.
    - `Uvicorn`: ASGI server.
    - `Pandas`: Data manipulation and analysis library.
    - `Openpyxl`: Library for reading/writing Excel files.
    - `SQLModel`: Library for interacting with SQL databases.

### Recent Changes (Latest Session)
- Restructured Gantt from composite labels to dedicated table columns per field
- Implemented dynamic month expansion based on data's maximum span
- Added year wrapping labels (Jan Y+1, Feb Y+1, etc.) for clarity
- Implemented resizable column functionality with mouse drag
- All features maintain compatibility with existing filtering and grouping
