import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  exportToExcelWithColumns,
  exportTableAsPNG,
  exportTableAsJPG,
  exportTableAsPDF,
  exportAsJSON,
  exportTableAsSVG,
  exportAsLZL
} from '../utils/exportUtils'

export default function ExportPanel({
  records,
  ganttElementId,
  groupingColumns,
  filterColumn,
  groupedData,
  dynamicMonthCount,
  columnWidth
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [pdfOrientation, setPdfOrientation] = useState('landscape')
  const [imageScale, setImageScale] = useState('high')

  // Excel column selection
  const [selectedColumns, setSelectedColumns] = useState([
    ...groupingColumns,
    'period',
    'cropProcess',
    'month_mask'
  ])

  // Available columns for selection
  const allAvailableColumns = [
    ...groupingColumns,
    'period',
    'cropProcess',
    'month_mask',
    'countryName',
    'cropName',
    'cropId',
    'start_date',
    'end_date',
    'allYear',
    'currentYear',
    'lastUpdated',
    'notes'
  ]

  const toggleColumn = (col) => {
    setSelectedColumns(prev =>
      prev.includes(col)
        ? prev.filter(c => c !== col)
        : [...prev, col]
    )
  }

  const selectAll = () => {
    setSelectedColumns(allAvailableColumns)
  }

  const deselectAll = () => {
    setSelectedColumns(groupingColumns)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let result

      switch (selectedFormat) {
        case 'excel':
          result = await exportToExcelWithColumns(
            records,
            groupedData,
            groupingColumns,
            selectedColumns
          )
          break

        case 'png':
          result = await exportTableAsPNG(
            ganttElementId,
            { scale: imageScale === 'high' ? 2 : 1 }
          )
          break

        case 'jpg':
          result = await exportTableAsJPG(
            ganttElementId,
            { scale: imageScale === 'high' ? 2 : 1 }
          )
          break

        case 'pdf':
          result = await exportTableAsPDF(ganttElementId, {
            orientation: pdfOrientation,
            scale: imageScale === 'high' ? 2 : 1
          })
          break

        case 'json':
          result = exportAsJSON(records, groupedData, groupingColumns)
          break

        case 'svg':
          result = await exportTableAsSVG(ganttElementId)
          break

        case 'lzl':
          result = await exportAsLZL(records, ganttElementId, {
            groupingColumns,
            filterColumn,
            groupedData
          })
          break

        default:
          throw new Error('Unknown export format')
      }

      if (result.success) {
        toast.success(result.message, { duration: 2000 })
        setIsOpen(false)
      } else {
        toast.error('Export failed: ' + result.error, { duration: 3000 })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export error: ' + error.message, { duration: 3000 })
    } finally {
      setIsExporting(false)
    }
  }

  const formatOptions = [
    { value: 'excel', label: '📊 Excel - Professional table with column selection', icon: '📊' },
    { value: 'png', label: '🖼️ PNG - Full table image (entire width)', icon: '🖼️' },
    { value: 'jpg', label: '📸 JPG - Compressed image (entire width)', icon: '📸' },
    { value: 'pdf', label: '📄 PDF - Multi-page document (entire table)', icon: '📄' },
    { value: 'svg', label: '📐 SVG - Scalable vector (full width)', icon: '📐' },
    { value: 'json', label: '📋 JSON - Data export', icon: '📋' },
    { value: 'lzl', label: '📦 LZL - Portable package', icon: '📦' }
  ]

  return (
    <div className="relative">
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center gap-2"
        disabled={isExporting}
      >
        📥 {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {/* Export Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 sticky top-0">
            <h3 className="font-bold text-gray-900">Export Data</h3>
            <p className="text-xs text-gray-600 mt-1">
              {records.length} records • {groupingColumns.length} grouping fields
            </p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Select Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {formatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Excel Column Selection */}
            {selectedFormat === 'excel' && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-900">
                    📋 Columns to Include
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={selectAll}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto bg-white p-2 rounded border border-gray-200">
                  {allAvailableColumns.map(col => (
                    <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col)}
                        onChange={() => toggleColumn(col)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{col}</span>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ Select columns to include in the professional Excel table export
                </p>
              </div>
            )}

            {/* PDF Options */}
            {selectedFormat === 'pdf' && (
              <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <label className="block text-sm font-semibold text-gray-900">
                  Page Orientation
                </label>
                <select
                  value={pdfOrientation}
                  onChange={(e) => setPdfOrientation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                >
                  <option value="landscape">Landscape (Recommended)</option>
                  <option value="portrait">Portrait</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ Full table captured across all columns with multi-page support
                </p>
              </div>
            )}

            {/* Image Resolution Options */}
            {(selectedFormat === 'png' || selectedFormat === 'jpg' || selectedFormat === 'pdf') && (
              <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <label className="block text-sm font-semibold text-gray-900">
                  Resolution/Quality
                </label>
                <select
                  value={imageScale}
                  onChange={(e) => setImageScale(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                >
                  <option value="high">High (2x Scale - Better Quality)</option>
                  <option value="normal">Normal (1x Scale - Smaller File)</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  ✅ Captures ENTIRE table with all columns and rows • All text clearly visible
                </p>
              </div>
            )}

            {/* Info for other formats */}
            {selectedFormat === 'json' && (
              <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                <p className="text-xs text-gray-600">
                  ℹ️ Exports all records with complete metadata and grouping information
                </p>
              </div>
            )}

            {selectedFormat === 'svg' && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-gray-600">
                  ℹ️ Scalable vector graphic of the complete Gantt table (full width)
                </p>
              </div>
            )}

            {selectedFormat === 'lzl' && (
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-xs text-gray-600">
                  ℹ️ Portable ZIP package with data, metadata, and full-resolution preview
                </p>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-medium text-sm mt-4"
            >
              {isExporting ? '⏳ Exporting...' : '📥 Export Now'}
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center sticky bottom-0">
            <p className="text-xs text-gray-600">
              💡 Image/PDF exports capture the complete table with all columns
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  )
}
