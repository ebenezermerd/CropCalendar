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

- **Advanced Export Functionality - 6 Formats**:
    - **📊 Excel**: Professional table export with multi-select column chooser (all columns selectable by default)
    - **🖼️ PNG/JPG**: Full-width table capture with entire content, all columns visible, clean text rendering
    - **📄 PDF**: Multi-page document with landscape/portrait orientation, complete table presentation
    - **📐 SVG**: Scalable vector format of complete table with full width
    - **📋 JSON**: Complete data export with metadata and grouping information
    - **📦 LZL**: Portable ZIP package with metadata, data, and full-resolution preview
    - **Quality/Resolution Options**: High (2x scale) or Normal (1x scale) for images/PDF

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

### Recent Changes (Current Session - Advanced Export Fixes)
**Session 5 - Advanced Export Functionality & Fixes:**

**Critical Fixes Implemented:**
- **Image/PDF Export - Complete Table Capture**:
  - ✅ Captures ENTIRE table width with all columns visible (not cut off at "field march")
  - ✅ Fixed text rendering issue: all column headers and row text now fully visible
  - ✅ Implemented `captureFullTable()` helper that properly handles scrollable content
  - ✅ Uses `html2canvas` with correct width/height constraints and DOM positioning
  - ✅ Prevents CSS overlays from obscuring text (removes hover states during capture)
  - ✅ High/Normal resolution options: 2x scale for crisp quality, 1x for smaller files

- **Excel Export - Professional with Column Selection**:
  - ✅ Replaced raw data export with professional table format
  - ✅ Multi-select column chooser UI with All/None buttons
  - ✅ All columns selected by default for convenience
  - ✅ Professional styling: colored headers, alternating row colors, proper borders
  - ✅ Metadata section shows export date, record count, selected columns
  - ✅ Proper column widths and row heights for readability

- **Export Dialog Enhancements**:
  - ✅ Dropdown format selector (single choice)
  - ✅ Format-specific options appear only for selected format
  - ✅ Color-coded sections for each format type
  - ✅ Helpful tips explaining what each export captures
  - ✅ Column selection UI for Excel (multi-checkbox with All/None shortcuts)

**Technical Implementation Details:**
- `captureFullTable()`: New helper function that creates a temporary DOM wrapper, clones the table, and captures with proper width/height constraints
- `exportToExcelWithColumns()`: Replaces `exportToExcelAsTable()` with column selection support and professional formatting
- `exportTableAsPNG/JPG/PDF()`: Updated to use `captureFullTable()` for complete table rendering
- Improved `ExportPanel` component with column selection UI when Excel format is selected
- All image exports now capture entire scrollable content without truncation

**Previous Session Improvements:**
- Fixed ghost bar issue in year-wrapping periods (Oct-Jan) by filtering duplicate range rendering
- Implemented dynamic field column resizing (Country, Period, CropProcess columns now resize independently)
- Created initial export dialog with format selection
- Restructured Gantt from composite labels to dedicated table columns per field
- Implemented dynamic month expansion based on data's maximum span
- Added year wrapping labels (Jan Y+1, Feb Y+1, etc.) for clarity
- Implemented resizable month column functionality with mouse drag
