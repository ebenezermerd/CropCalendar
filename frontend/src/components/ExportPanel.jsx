import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  exportToExcel,
  exportGanttAsPNG,
  exportGanttAsJPG,
  exportGanttAsPDF,
  exportAsJSON,
  exportGanttAsSVG,
  exportAsLZL
} from '../utils/exportUtils'

export default function ExportPanel({ records, ganttElementId, groupingColumns, filterColumn }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('excel')
  const [excelFormat, setExcelFormat] = useState('all')
  const [pdfOrientation, setPdfOrientation] = useState('landscape')

  const handleExport = async (format) => {
    setIsExporting(true)
    try {
      let result

      switch (format) {
        case 'excel':
          result = await exportToExcel(records, { format: excelFormat })
          break

        case 'png':
          result = await exportGanttAsPNG(ganttElementId)
          break

        case 'jpg':
          result = await exportGanttAsJPG(ganttElementId, 0.95)
          break

        case 'pdf':
          result = await exportGanttAsPDF(ganttElementId, pdfOrientation)
          break

        case 'json':
          result = exportAsJSON(records)
          break

        case 'svg':
          result = exportGanttAsSVG(ganttElementId)
          break

        case 'lzl':
          result = await exportAsLZL(records, ganttElementId, {
            groupingColumns,
            filterColumn
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Export Options</h3>
            <p className="text-xs text-gray-600 mt-1">
              {records.length} records available
            </p>
          </div>

          {/* Export Options */}
          <div className="p-4 space-y-4">
            {/* Excel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-sm text-gray-900">📊 Excel</label>
                <button
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  Export
                </button>
              </div>
              <select
                value={excelFormat}
                onChange={(e) => setExcelFormat(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white"
              >
                <option value="all">All Data (one sheet per country)</option>
                <option value="raw">Raw Rows (all in one sheet)</option>
                <option value="normalized">Normalized Only</option>
              </select>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <label className="font-semibold text-sm text-gray-900">🖼️ Images</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('png')}
                  disabled={isExporting}
                  className="flex-1 px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition"
                >
                  PNG
                </button>
                <button
                  onClick={() => handleExport('jpg')}
                  disabled={isExporting}
                  className="flex-1 px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition"
                >
                  JPG
                </button>
              </div>
            </div>

            {/* PDF */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-sm text-gray-900">📄 PDF</label>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition"
                >
                  Export
                </button>
              </div>
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white"
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>

            {/* SVG & Vector */}
            <div className="space-y-2">
              <label className="font-semibold text-sm text-gray-900">📐 Vector</label>
              <button
                onClick={() => handleExport('svg')}
                disabled={isExporting}
                className="w-full px-3 py-2 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 transition"
              >
                SVG
              </button>
            </div>

            {/* Data Formats */}
            <div className="space-y-2">
              <label className="font-semibold text-sm text-gray-900">📋 Data</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  className="flex-1 px-3 py-2 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:bg-gray-400 transition"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleExport('lzl')}
                  disabled={isExporting}
                  className="flex-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 transition"
                >
                  LZL
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
              <p className="font-semibold mb-1">Export formats:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Excel:</strong> Spreadsheet with options</li>
                <li><strong>PNG/JPG:</strong> Gantt chart as image</li>
                <li><strong>PDF:</strong> Multi-page if needed</li>
                <li><strong>SVG:</strong> Scalable vector graphic</li>
                <li><strong>JSON:</strong> Raw data export</li>
                <li><strong>LZL:</strong> Portable package (ZIP)</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  )
}
