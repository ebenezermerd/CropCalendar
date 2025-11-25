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
    - **Proper text rendering**: Field columns now display text with correct line heights and no clipping

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

### Recent Changes (Current Session - Text Rendering & Export Fixes)
**Session 6 - Text Rendering & Export Capture Fixes:**

**Critical Fixes Implemented:**
- **Text Clipping Issue - RESOLVED**:
  - ✅ Fixed truncated text in field columns (both live display and exports)
  - ✅ Replaced Tailwind `truncate` class with explicit `whitespace-nowrap overflow-hidden text-ellipsis`
  - ✅ Added proper `lineHeight: 1.4` to prevent vertical squeezing
  - ✅ Added `min-w-0` to flex containers for proper text sizing
  - ✅ Text now displays fully without clipping at top or bottom
  - ✅ Badge and text render together without vertical compression

- **Export Capture Improvements**:
  - ✅ Enhanced capture function to remove overflow clipping during export
  - ✅ Fixed flex alignment to ensure text renders at proper baseline
  - ✅ Implemented span inline-block rendering with vertical alignment
  - ✅ Added line-height corrections for proper text rendering
  - ✅ All styles automatically restored after capture (non-destructive)

- **Export Dialog Enhancements**:
  - ✅ Dropdown format selector (single choice - cleaner UX)
  - ✅ Format-specific options appear conditionally
  - ✅ Color-coded sections for visual clarity
  - ✅ Helpful tips and descriptions for each format
  - ✅ Column selection UI for Excel (multi-checkbox with All/None)

**Technical Implementation Details:**
- **GanttChart.jsx**: Updated field column styling to use explicit text-ellipsis handling
- **exportUtils.js**: Enhanced `captureFullTable()` with overflow removal and flex alignment fixes
- **Text Rendering**: Proper line-height and vertical alignment ensures no clipping
- **Restoration**: All temporary style changes are cleaned up after capture

**Previous Session Improvements:**
- Fixed ghost bar issue in year-wrapping periods (Oct-Jan)
- Implemented dynamic field column resizing
- Created initial export dialog with format selection
- Restructured Gantt from composite labels to dedicated table columns
- Implemented dynamic month expansion based on data's maximum span
- Added year wrapping labels (Jan Y+1, Feb Y+1, etc.)
- Implemented resizable month column functionality

### Known Issues & Limitations
None currently identified - all critical functionality is working as expected.

### Testing Recommendations
- ✅ Export PNG/JPG with High resolution - captures full table with all text visible
- ✅ Export PDF in landscape/portrait modes - multi-page support working
- ✅ Export Excel with column selection - professional formatting applied
- ✅ View Gantt chart with various grouping combinations - text displays properly
- ✅ Resize columns while viewing - layout remains stable
