import React, { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

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
      inRange = true
      rangeStart = i
    } else if (!hasMonth && inRange) {
      ranges.push({ start: rangeStart, end: i - 1 })
      inRange = false
    }
  }

  if (inRange) {
    if ((mask & 1) && rangeStart !== 0) {
      let janEnd = 0
      for (let i = 1; i < 12; i++) {
        if ((mask >> i) & 1) janEnd = i
        else break
      }
      
      ranges.push({ start: rangeStart, end: 11, wrapped: true })
      
      if (janEnd > 0) {
        ranges.push({ start: 0, end: janEnd, isWrapped: true })
      }
    } else {
      ranges.push({ start: rangeStart, end: 11 })
    }
  }

  return ranges
}

// Convert month range to date range
function formatDateRange(monthStart, monthEnd) {
  const startDay = 2
  const endDay = monthEnd === monthStart ? 15 : DAYS_IN_MONTH[monthEnd] - 2
  
  const startStr = `${MONTHS[monthStart]} ${String(startDay).padStart(2, '0')}`
  const endStr = `${MONTHS[monthEnd]} ${String(endDay).padStart(2, '0')}`
  
  return `${startStr} - ${endStr}`
}

// Get color for a specific row/group
function getColorForGroup(index) {
  return COLORS[index % COLORS.length]
}

export default function GanttChart({ filterResults, groupingColumns, onBack }) {
  const [zoomLevel, setZoomLevel] = useState('month')
  const [editingRowId, setEditingRowId] = useState(null)
  const [editingMask, setEditingMask] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [sortByCropProcess, setSortByCropProcess] = useState(null)

  const records = filterResults?.records || []
  const filterColumn = filterResults?.filter?.column
  
  const groupingColumnArray = Array.isArray(groupingColumns) ? groupingColumns : [groupingColumns]
  
  const parseGroupKey = (groupKey) => {
    const parts = groupKey.split(' | ')
    const fieldValues = {}
    groupingColumnArray.forEach((col, idx) => {
      fieldValues[col] = parts[idx] || 'Unknown'
    })
    return fieldValues
  }

  const groupedRecords = useMemo(() => {
    const groups = {}
    records.forEach((record, idx) => {
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

  let groupNames = Object.keys(groupedRecords).sort()

  if (sortByCropProcess === 'sort') {
    groupNames = groupNames.sort((a, b) => {
      const aFields = parseGroupKey(a)
      const bFields = parseGroupKey(b)
      
      const cropProcessCol = groupingColumnArray.find(col => 
        col.toLowerCase().includes('cropprocess') || col.toLowerCase().includes('crop_process')
      )
      
      if (cropProcessCol) {
        const aProcess = aFields[cropProcessCol] || ''
        const bProcess = bFields[cropProcessCol] || ''
        
        const processOrder = { 'Planting': 0, 'Growing': 1, 'Harvesting': 2 }
        const aOrder = processOrder[aProcess] ?? 999
        const bOrder = processOrder[bProcess] ?? 999
        
        if (aOrder !== bOrder) return aOrder - bOrder
      }
      
      return a.localeCompare(b)
    })
  }

  const cropProcessColumns = groupingColumnArray.filter(col =>
    col.toLowerCase().includes('cropprocess') || col.toLowerCase().includes('crop_process')
  )

  const cellWidth = zoomLevel === 'month' ? 60 : 180
  const cellHeight = 60
  const monthsPerCell = zoomLevel === 'month' ? 1 : 3
  const gridWidth = zoomLevel === 'month' ? 12 : 4
  
  // Dynamic column width for field columns
  const fieldColumnWidth = 140

  const handleSaveEdit = (groupKey, rowIdx) => {
    if (editingMask !== null) {
      toast.success('Month mask updated', {
        description: `Updated parsing for row`,
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
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              📅 Month View
            </button>
            <button
              onClick={() => setZoomLevel('quarter')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                zoomLevel === 'quarter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              📊 Quarter View
            </button>

            {cropProcessColumns.length > 0 && (
              <select
                value={sortByCropProcess || 'none'}
                onChange={(e) => setSortByCropProcess(e.target.value === 'none' ? null : e.target.value)}
                className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-900 hover:bg-gray-300 transition border border-gray-300"
              >
                <option value="none">Group by: All</option>
                <option value="sort">Group by: Crop Process</option>
              </select>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <strong>{groupNames.length}</strong> group{groupNames.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Gantt Table with Dynamic Columns */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header row */}
          <div className="flex border-b border-gray-300 bg-gray-50">
            {/* Field column headers */}
            {groupingColumnArray.map((col, idx) => (
              <div
                key={`header-${idx}`}
                className="font-bold text-gray-900 text-sm border-r border-gray-300 bg-gray-100 flex items-center justify-center"
                style={{ width: fieldColumnWidth, height: 50 }}
              >
                {col}
              </div>
            ))}

            {/* Month/Quarter headers */}
            {Array.from({ length: gridWidth }).map((_, cellIdx) => {
              if (zoomLevel === 'month') {
                const month = MONTHS[cellIdx]
                return (
                  <div
                    key={`month-${cellIdx}`}
                    className="text-center font-semibold text-gray-700 text-sm border-r border-gray-300 bg-gray-100 flex items-center justify-center"
                    style={{ width: cellWidth, height: 50 }}
                  >
                    {month}
                  </div>
                )
              } else {
                const quarter = `Q${cellIdx + 1}`
                return (
                  <div
                    key={`quarter-${cellIdx}`}
                    className="text-center font-semibold text-gray-700 text-sm border-r border-gray-300 bg-gray-100 flex items-center justify-center"
                    style={{ width: cellWidth, height: 50 }}
                  >
                    {quarter}
                  </div>
                )
              }
            })}
          </div>

          {/* Data rows */}
          {groupNames.map((groupKey, groupIdx) => {
            const fields = parseGroupKey(groupKey)
            const groupRecords = groupedRecords[groupKey]

            return (
              <div key={groupKey} className="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                {/* Field value columns */}
                {groupingColumnArray.map((col, colIdx) => (
                  <div
                    key={`${groupKey}-field-${colIdx}`}
                    className="text-sm text-gray-900 border-r border-gray-200 flex items-center px-3 font-medium bg-gray-50"
                    style={{ width: fieldColumnWidth, height: cellHeight }}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      {colIdx === 0 && (
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: getColorForGroup(groupIdx) }}
                        ></div>
                      )}
                      <span className="truncate" title={fields[col]}>
                        {fields[col]}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Gantt bars */}
                {groupRecords.map((record, recordIdx) => (
                  <div
                    key={`${groupKey}-bar-${recordIdx}`}
                    className="relative border-r border-gray-200 flex items-center"
                    style={{ width: cellWidth * gridWidth, height: cellHeight }}
                    onMouseEnter={() => setHoveredRow(`${groupKey}-${recordIdx}`)}
                    onMouseLeave={() => setHoveredRow(null)}
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
                          const dateRange = formatDateRange(range.start, range.end)

                          return (
                            <div
                              key={rangeIdx}
                              className="absolute h-8 rounded shadow-sm hover:shadow-md transition cursor-pointer group"
                              style={{
                                backgroundColor: getColorForGroup(groupIdx),
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
                              {/* Tooltip */}
                              {hoveredRow === `${groupKey}-${recordIdx}` && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                  {dateRange}
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
            )
          })}
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <p className="text-blue-900 text-sm">
          💡 <strong>Tip:</strong> Click on any harvest bar to edit the month mask. Hover to see date ranges (e.g., Jan 02 - Feb 04) and full row details.
        </p>
        {cropProcessColumns.length > 0 && (
          <p className="text-blue-900 text-sm">
            📊 Use the dropdown to group by Crop Process (Planting, Growing, Harvesting) for hierarchical viewing.
          </p>
        )}
      </div>
    </div>
  )
}
