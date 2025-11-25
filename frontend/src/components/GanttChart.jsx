import React, { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#06B6D4', '#6366F1', '#D97706', '#059669', '#7C3AED', '#DC2626'
]

// Extract contiguous month ranges from 12-bit month_mask
function extractMonthRanges(mask) {
  const ranges = []
  let inRange = false
  let rangeStart = -1

  for (let i = 0; i < 12; i++) {
    const hasMonth = (mask >> i) & 1
    
    if (hasMonth && !inRange) {
      // Start of a new range
      inRange = true
      rangeStart = i
    } else if (!hasMonth && inRange) {
      // End of current range
      ranges.push({ start: rangeStart, end: i - 1 })
      inRange = false
    }
  }

  // Handle wraparound: if range was in progress and also bit 0 is set (Jan)
  if (inRange) {
    // Check if it wraps to January
    if ((mask & 1) && rangeStart !== 0) {
      // Find where the January range ends
      let janEnd = 0
      for (let i = 1; i < 12; i++) {
        if ((mask >> i) & 1) janEnd = i
        else break
      }
      
      // Add the December-forward range
      ranges.push({ start: rangeStart, end: 11, wrapped: true })
      
      // Add the January-forward range if it's not the same as start
      if (janEnd > 0) {
        ranges.push({ start: 0, end: janEnd, isWrapped: true })
      }
    } else {
      // Simple end-of-year range
      ranges.push({ start: rangeStart, end: 11 })
    }
  }

  return ranges
}

// Get color for a specific row/group
function getColorForGroup(index, groupName) {
  return COLORS[index % COLORS.length]
}

export default function GanttChart({ filterResults, groupingColumns, onBack }) {
  const [zoomLevel, setZoomLevel] = useState('month') // 'month' or 'quarter'
  const [editingRowId, setEditingRowId] = useState(null)
  const [editingMask, setEditingMask] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  const records = filterResults?.records || []
  const filterColumn = filterResults?.filter?.column
  
  // Support both single string (legacy) and array of columns (new multi-select)
  const groupingColumnArray = Array.isArray(groupingColumns) ? groupingColumns : [groupingColumns]
  
  // Group records by their grouping column values
  const groupedRecords = useMemo(() => {
    const groups = {}
    records.forEach((record, idx) => {
      // Create composite key from all grouping columns
      const groupKey = groupingColumnArray
        .map(col => record[col] || 'Unknown')
        .join(' | ')
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push({ ...record, _index: idx })
    })
    return groups
  }, [records, groupingColumnArray])

  const groupNames = Object.keys(groupedRecords).sort()

  // Calculate grid dimensions
  const cellWidth = zoomLevel === 'month' ? 60 : 180 // pixels per cell
  const cellHeight = 60 // pixels per row
  const monthsPerCell = zoomLevel === 'month' ? 1 : 3 // months per cell
  const gridWidth = zoomLevel === 'month' ? 12 : 4

  const handleSaveEdit = (groupKey, rowIdx) => {
    if (editingMask !== null) {
      // TODO: Call backend to save edited month_mask
      toast.success('Month mask updated', {
        description: `Updated parsing for ${groupKey}`,
        duration: 2000
      })
      setEditingRowId(null)
      setEditingMask(null)
    }
  }

  const handleToggleMonth = (monthIdx) => {
    if (editingMask === null) return
    const newMask = editingMask ^ (1 << monthIdx)
    setEditingMask(newMask)
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="light" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gantt Visualization</h2>
          <p className="text-gray-600 text-sm mt-1">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">Filtered by: {filterColumn}</span>
            Interactive month-grid showing harvest periods grouped by <strong>{groupingColumnArray.join(' + ')}</strong>
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
        >
          Back
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setZoomLevel('month')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                zoomLevel === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              📅 Month View
            </button>
            <button
              onClick={() => setZoomLevel('quarter')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                zoomLevel === 'quarter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              📊 Quarter View
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {records.length} record{records.length !== 1 ? 's' : ''} • {groupNames.length} group{groupNames.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
        <div className="inline-block">
          {/* Header with months/quarters */}
          <div className="flex">
            {/* Empty corner for row labels */}
            <div className="w-48 flex-shrink-0 border-b border-gray-300"></div>

            {/* Month/Quarter headers */}
            <div className="flex border-b border-gray-300">
              {Array.from({ length: gridWidth }).map((_, cellIdx) => {
                if (zoomLevel === 'month') {
                  const month = MONTHS[cellIdx]
                  return (
                    <div
                      key={cellIdx}
                      className="text-center font-semibold text-gray-700 text-sm border-r border-gray-300"
                      style={{ width: cellWidth }}
                    >
                      {month}
                    </div>
                  )
                } else {
                  const quarter = `Q${cellIdx + 1}`
                  return (
                    <div
                      key={cellIdx}
                      className="text-center font-semibold text-gray-700 text-sm border-r border-gray-300"
                      style={{ width: cellWidth }}
                    >
                      {quarter}
                    </div>
                  )
                }
              })}
            </div>
          </div>

          {/* Rows (groups) */}
          {groupNames.map((groupKey, groupIdx) => (
            <div key={groupKey} className="flex border-b border-gray-200 last:border-b-0">
              {/* Group label */}
              <div
                className="w-48 flex-shrink-0 p-3 font-medium text-gray-900 text-sm bg-gray-50 border-r border-gray-200 flex items-center"
              >
                <div
                  className="w-3 h-3 rounded mr-2 flex-shrink-0"
                  style={{ backgroundColor: getColorForGroup(groupIdx, groupKey) }}
                ></div>
                {groupKey}
              </div>

              {/* Gantt bars for each record in this group */}
              <div
                className="flex"
                onMouseLeave={() => setHoveredRow(null)}
              >
                {groupedRecords[groupKey].map((record, recordIdx) => (
                  <div
                    key={`${groupKey}-${recordIdx}`}
                    className="relative border-r border-gray-200 flex items-center"
                    style={{ width: cellWidth * gridWidth, height: cellHeight }}
                    onMouseEnter={() => setHoveredRow(`${groupKey}-${recordIdx}`)}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: gridWidth }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-gray-100"
                        ></div>
                      ))}
                    </div>

                    {/* Month mask bars */}
                    <div className="absolute inset-0 flex items-center p-1">
                      {record.month_mask ? (
                        extractMonthRanges(record.month_mask).map((range, rangeIdx) => {
                          const startCell = zoomLevel === 'month' 
                            ? range.start 
                            : Math.floor(range.start / 3)
                          const endCell = zoomLevel === 'month' 
                            ? range.end 
                            : Math.floor(range.end / 3)
                          
                          const barWidth = (endCell - startCell + 1) * cellWidth - 8
                          const barLeft = startCell * cellWidth + 4

                          return (
                            <div
                              key={rangeIdx}
                              className="absolute h-8 rounded shadow-sm hover:shadow-md transition cursor-pointer group"
                              style={{
                                backgroundColor: getColorForGroup(groupIdx, groupKey),
                                opacity: hoveredRow === `${groupKey}-${recordIdx}` ? 1 : 0.7,
                                width: barWidth,
                                left: barLeft,
                                top: '50%',
                                transform: 'translateY(-50%)'
                              }}
                              onClick={() => {
                                setEditingRowId(`${groupKey}-${recordIdx}`)
                                setEditingMask(record.month_mask)
                              }}
                            >
                              {/* Tooltip on hover */}
                              {hoveredRow === `${groupKey}-${recordIdx}` && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                  {range.start !== range.end 
                                    ? `${MONTHS[range.start]} - ${MONTHS[range.end]}`
                                    : MONTHS[range.start]}
                                  {range.wrapped && ' (wraps year)'}
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-xs text-gray-400">No data</div>
                      )}
                    </div>

                    {/* Full row tooltip */}
                    {hoveredRow === `${groupKey}-${recordIdx}` && (
                      <div className="absolute left-full top-0 ml-2 bg-gray-900 text-white text-xs rounded p-3 z-20 whitespace-nowrap max-w-xs pointer-events-none">
                        <div className="font-semibold mb-1">Row #{record._index + 1}</div>
                        <div className="space-y-1 text-gray-200">
                          {Object.entries(record).map(([key, val]) => {
                            if (key.startsWith('_') || key === 'month_mask' || key === 'parsed_data') return null
                            return (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(val).substring(0, 30)}
                              </div>
                            )
                          })}
                          {record.month_mask && (
                            <div>
                              <span className="font-medium">Mask:</span> {record.month_mask.toString(2).padStart(12, '0')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inline Edit Modal */}
      {editingRowId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Month Mask</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Click months to toggle:</p>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, idx) => {
                  const isActive = (editingMask >> idx) & 1
                  return (
                    <button
                      key={idx}
                      onClick={() => handleToggleMonth(idx)}
                      className={`py-2 px-3 rounded text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {month}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded text-sm font-mono text-gray-700">
              Mask: {editingMask.toString(2).padStart(12, '0')} ({editingMask})
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setEditingRowId(null)
                  setEditingMask(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingRowId.split('-')[0], editingRowId)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 text-sm">
          💡 <strong>Tip:</strong> Click on any harvest bar to edit the month mask. Hover to see full row details and source index.
        </p>
      </div>
    </div>
  )
}
