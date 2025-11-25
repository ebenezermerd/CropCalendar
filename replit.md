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
    - **CropProcess filtering**: Three convenient filter buttons to show all processes, sowing only, or harvesting only
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

### Recent Changes (Session 8 - Crop Process Filtering)
**Session 8 - Crop Process Filter Buttons:**

**Major Feature Implemented:**

1. **Crop Process Filter Buttons - Created**:
   - ✅ Three new filter buttons added to Gantt visualization controls:
     - **📊 All Processes** - Shows all crop processes (default)
     - **🌱 Sowing Only** - Filters to show only Sowing/Planting records
     - **🌾 Harvesting Only** - Filters to show only Harvesting records
   - ✅ Buttons use distinct color coding for easy identification (purple, green, amber)
   - ✅ Only one filter can be active at a time
   - ✅ Active filter displays with highlighted background color

**Technical Implementation Details:**
- **State Management**: Added `cropProcessFilter` state with 'all', 'sowing', 'harvesting' options
- **Filter Logic**: Created `filteredRecords` useMemo that filters records based on:
  - Sowing filter matches "sowing" OR "planting" (case-insensitive)
  - Harvesting filter matches "harvesting" (case-insensitive)
- **Dynamic Updates**: 
  - Filtered records update all dependent computations (grouping, month span calculation)
  - Record count displayed shows filtered count
  - Export functionality automatically exports only filtered records
- **UI Integration**: Filter buttons appear only when cropProcess column is in grouping columns
- **Visual Feedback**: 
  - Active filter button highlighted with colored background
  - Record count updates to reflect filtered results
  - Smooth transitions between filter states

**Previous Session Improvements:**
- Column dividers: 2px solid borders on month columns for visual hierarchy
- Loading animations: Integrated LoadingSpinner across all async operations
- Fixed export text clipping by adjusting cell heights and removing overflow constraints
- Implemented 12-bit month mask system for efficient date range handling

### Known Issues & Limitations
None currently identified - all critical functionality is working as expected.

### Testing Recommendations
- ✅ Upload agricultural data file (CSV, XLSX, XLS, or XML)
- ✅ Apply column mapping and parse data
- ✅ Filter data by a column value (e.g., crop name)
- ✅ In Gantt visualization, verify crop process filter buttons appear
- ✅ Click "🌱 Sowing Only" button - should show only sowing/planting records
- ✅ Click "🌾 Harvesting Only" button - should show only harvesting records
- ✅ Click "📊 All Processes" button - should show all records
- ✅ Verify record count updates to reflect filtered results
- ✅ Verify export operations export only filtered records
