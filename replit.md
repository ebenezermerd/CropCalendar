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

- **Comprehensive Export Functionality**:
    - **Smart Format Selection**: Dropdown-based format selector with context-specific options
    - **Excel Exports**: 4 options (table with formatting, raw data, normalized, by country)
    - **Image Exports**: PNG/JPG with full table capture and dynamic column width preservation
    - **PDF Export**: Multi-page support with landscape/portrait orientation, entire table captured
    - **SVG Export**: Scalable vector format of complete table presentation
    - **JSON/LZL**: Data export with metadata and grouping information
    - **Quality/Resolution Options**: Choose between high-quality (2x scale) or normal (1x) rendering

### External Dependencies
- **Frontend**:
    - `React`: JavaScript library for building user interfaces.
    - `Vite`: Frontend build tool.
    - `Tailwind CSS`: Utility-first CSS framework.
    - `Axios`: Promise-based HTTP client.
    - `Sonner`: Toast notification library.
    - `html2canvas`: Convert DOM to canvas for image export (PNG/JPG/PDF).
    - `jsPDF`: Generate PDF documents client-side with multi-page support.
    - `XLSX`: Excel workbook generation with formatting support.
    - `JSZip`: Create ZIP archives for LZL export format.
- **Backend**:
    - `FastAPI`: Web framework for building APIs.
    - `Uvicorn`: ASGI server.
    - `Pandas`: Data manipulation and analysis library.
    - `Openpyxl`: Library for reading/writing Excel files.
    - `SQLModel`: Library for interacting with SQL databases.

### Recent Changes (Current Session - Export Redesign)
**Session 4 - Export Dialog Redesign & Full Table Export Implementation:**
- **Completely redesigned export dialog**: 
  - Single format selector dropdown (eliminates list format)
  - Format-specific options appear only after format selection
  - Clear explanations for each export format
  - Improved visual hierarchy with color-coded sections
  - Shows record count and grouping fields in header

- **Fixed critical export issue - Now exports complete table presentation**:
  - **Excel (.xlsx)**: 
    - "Full Table with Formatting" - exports Gantt layout with visual shading and group headers
    - Raw data, normalized, and by-country options available
    - Includes header styling and alternating row colors
  - **PNG/JPG**: 
    - Captures entire table with all groups and rows (not just visible area)
    - Respects dynamic column width configuration
    - High/Normal resolution options (2x or 1x scale)
  - **PDF**: 
    - Multi-page support for large tables
    - Landscape/Portrait orientation selection
    - Full table capture with professional layout
  - **SVG/JSON/LZL**: 
    - SVG: Complete scalable vector export
    - JSON: Full data with metadata and grouping info
    - LZL: Portable ZIP with metadata, data, and preview PNG

- **UI/UX Improvements**:
  - Export button remains consistent green button with dropdown
  - Format options clearly labeled with emojis for visual recognition
  - Helpful tips showing how many records will be exported
  - Quality/resolution options for image formats
  - All exports use professional naming with timestamps

- **Technical Implementation**:
  - `exportToExcelAsTable()`: Exports table with visual formatting (colors, shading, group headers)
  - `exportTableAsPNG/JPG/PDF()`: New functions that capture entire table with dynamic widths
  - Improved html2canvas configuration for better rendering of complex layouts
  - Proper page breaks and sizing for PDF multi-page support
  - All exports now include grouped data and metadata

**Previous Session Fixes:**
- Fixed ghost bar issue in year-wrapping periods (Oct-Jan) by filtering duplicate range rendering
- Implemented dynamic field column resizing (Country, Period, CropProcess columns now resize independently)
- Restructured Gantt from composite labels to dedicated table columns per field
- Implemented dynamic month expansion based on data's maximum span
- Added year wrapping labels (Jan Y+1, Feb Y+1, etc.) for clarity
- Implemented resizable month column functionality with mouse drag
- All features maintain compatibility with existing filtering and grouping
