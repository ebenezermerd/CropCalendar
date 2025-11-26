# Crop Calendar Gantt Export Tool

### Overview
The Crop Calendar Gantt Export Tool is a professional-grade application designed to process agricultural data, visualize crop seasonality, and prepare it for export. It streamlines the workflow from raw file upload to interactive Gantt chart visualization, focusing on robust data parsing, intelligent column mapping, and flexible filtering. The tool aims to provide a clear, interactive overview of crop harvesting periods, enabling detailed analysis and future export capabilities.

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
    - **Harvesting filter**: Button to show only harvesting records (system focused on harvesting operations)
    - **Visual rectangles**: Generated from month masks with color-coding and year-end wrapping
    - **Date range tooltips**: Hover shows actual dates (e.g., "Jan 02 - Feb 26")
    - **Inline editing**: Click bars to edit month masks
    - **Proper text rendering**: Field columns now display text with correct line heights and no clipping
    - **Professional column dividers**: 2px solid borders on month columns matching field column styling for visual consistency

- **Advanced Export Functionality - 6 Formats**:
    - **📊 Excel**: Professional table export with multi-select column chooser (all columns selectable by default)
    - **🖼️ PNG/JPG**: Full-width table capture with entire content, all columns visible, clean text rendering
    - **📄 PDF**: Multi-page document with landscape/portrait orientation, complete table presentation
    - **📐 SVG**: Scalable vector format of complete table with full width
    - **📋 JSON**: Complete data export with metadata and grouping information
    - **📦 LZL**: Portable ZIP package with metadata, data, and full-resolution preview
    - **Quality/Resolution Options**: High (2x scale) or Normal (1x scale) for images/PDF

- **Loading Animations**: Professional spinning loader component used throughout the app for:
    - File upload progress
    - Column mapping loading/saving
    - Data parsing
    - Filtering operations
    - Export operations (modal overlay)
    - All async operations providing clear user feedback

### External Dependencies
- **Frontend**:
    - `React`: JavaScript library for building user interfaces.
    - `Vite`: Frontend build tool.
    - `Tailwind CSS`: Utility-first CSS framework.
    - `Axios`: Promise-based HTTP client.
    - `Sonner`: Toast notification library.
    - `html2canvas`: Convert DOM to canvas for image export (PNG/JPG/PDF).
    - `jsPDF`: Generate PDF documents client-side with multi-page support.
    - `XLSX`: Excel workbook generation with professional formatting.
    - `JSZip`: Create ZIP archives for LZL export format.
- **Backend**:
    - `FastAPI`: Web framework for building APIs.
    - `Uvicorn`: ASGI server.
    - `Pandas`: Data manipulation and analysis library.
    - `Openpyxl`: Library for reading/writing Excel files.
    - `SQLModel`: Library for interacting with SQL databases.

### Recent Changes (Session 9 - Harvesting-Only Focus)
**Session 9 - Simplified Crop Process Filtering:**

**Major Update:**
1. **Removed Sowing Filter - System Now Harvesting-Focused**:
   - ✅ Removed "🌱 Sowing Only" button entirely
   - ✅ System now focuses exclusively on harvesting operations
   - ✅ Two filter buttons remain:
     - **📊 All** - Shows all records
     - **🌾 Harvesting Only** - Filters to show only harvesting records
   - ✅ Cleaner UI, simplified workflow

**Technical Changes:**
- Removed sowing filter logic from `filteredRecords` useMemo
- Updated state comment to reflect only 'all' and 'harvesting' options
- Simplified UI with two-button filter control
- All export and visualization features work with harvesting-focused data

### Previous Session Work (Session 8 - Crop Process Filtering)
- Initial implementation of crop process filter buttons
- Added three filter options (all, sowing, harvesting)
- Integrated filter state management and dynamic UI updates
- Connected filters to export functionality

### Earlier Improvements (Sessions 6-7)
- Professional column dividers with 2px solid borders
- Loading animations integrated throughout the app
- Fixed export text clipping and rendering issues
- Implemented 12-bit month mask system for efficient date handling

### Known Issues & Limitations
None currently identified - all critical functionality is working as expected.

### Testing Recommendations
- ✅ Upload agricultural data file (CSV, XLSX, XLS, or XML)
- ✅ Apply column mapping and parse data
- ✅ Filter data by a column value (e.g., crop name)
- ✅ In Gantt visualization, verify harvest filter buttons appear
- ✅ Click "🌾 Harvesting Only" - shows only harvesting records
- ✅ Click "📊 All" - shows all records
- ✅ Verify record count updates to reflect filtered results
- ✅ Verify export operations export only filtered records
