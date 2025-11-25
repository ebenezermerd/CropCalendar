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

### Recent Changes (Current Session - UX Improvements & Loading Animations)
**Session 7 - Column Dividers & Loading Animations:**

**Major UX Improvements Implemented:**

1. **Professional Column Dividers - Enhanced**:
   - ✅ Month column headers now have 2px solid borders (instead of 1px thin)
   - ✅ Month data rows have matching 2px solid borders for visual hierarchy
   - ✅ Creates clear visual separation between months, similar to field column dividers
   - ✅ Improves table scanability and professional appearance

2. **Reusable LoadingSpinner Component - Created**:
   - ✅ New `LoadingSpinner.jsx` component with three size options (sm, md, lg)
   - ✅ Customizable message text
   - ✅ Animated rotating spinner using Tailwind CSS
   - ✅ Consistent visual styling across entire app

3. **Loading States Integrated Throughout**:
   - ✅ **File Upload**: Shows LoadingSpinner with progress bar during upload
   - ✅ **Column Mapping**: Loading and saving states show LoadingSpinner
   - ✅ **Data Parsing**: Large spinner during parse operation with "may take a moment" hint
   - ✅ **Filtering**: Shows loading screen during filter application
   - ✅ **Export**: Full-screen modal overlay with LoadingSpinner during export
   - ✅ All loading states provide clear user feedback

**Technical Implementation Details:**
- **LoadingSpinner.jsx**: Reusable component with size variants (sm: 8x8, md: 12x12, lg: 16x16)
- **GanttChart.jsx**: Updated month column headers and data row grids with 2px borders
- **GroupSelector.jsx**: Integrated LoadingSpinner for initial load and filtering state
- **ExportPanel.jsx**: Added full-screen loading modal during export with format info
- **FileUpload.jsx**: Uses LoadingSpinner with progress bar for upload feedback
- **ColumnMapping.jsx**: Shows LoadingSpinner for load and save states
- **ParsingResults.jsx**: Large LoadingSpinner with helpful message during parsing

**Previous Session Improvements:**
- Fixed export text clipping by increasing cell heights and removing overflow constraints
- Replaced `truncate` class with explicit ellipsis handling
- Implemented precise cell height adjustments for exports (50px→55px headers, 60px→70px rows)
- Enhanced export capture function with proper text rendering

### Known Issues & Limitations
None currently identified - all critical functionality is working as expected.

### Testing Recommendations
- ✅ Column dividers appear as 2px solid lines between month columns
- ✅ Loading spinner appears during file upload with progress bar
- ✅ Loading spinner appears when loading column mappings
- ✅ Loading spinner appears during data parsing
- ✅ Loading spinner appears during filtering
- ✅ Export modal shows loading spinner during export operations
- ✅ All loading states provide appropriate user feedback
