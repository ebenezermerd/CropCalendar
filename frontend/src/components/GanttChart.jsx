import React, { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'
import ExportPanel from './ExportPanel'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#06B6D4', '#6366F1', '#D97706', '#059669', '#7C3AED', '#DC2626'
]

function extractMonthRanges(mask) {
  const ranges = []
  let inRange = false
  let rangeStart = -1

  // First pass: collect all continuous ranges
  for (let i = 0; i < 12; i++) {
    const hasMonth = (mask >> i) & 1
    
    if (hasMonth && !inRange) {
      inRange = true
      rangeStart = i
    } else if (!hasMonth && inRange) {
      ranges.push({ start: rangeStart, end: i - 1, wrapsYear: false })
      inRange = false
    }
  }

  // Handle case where range extends to end of year
  if (inRange) {
    ranges.push({ start: rangeStart, end: 11, wrapsYear: false })
  }

  // Check for year-wrapping: if Jan (bit 0) is set and there's a range starting in latter half of year
  if ((mask & 1) && ranges.some(r => r.start >= 6)) {
    // Find the Jan-based range (should be at start)
    let janEnd = 0
    for (let i = 1; i < 12; i++) {
      if ((mask >> i) & 1) janEnd = i
      else break
    }
    
    // Mark the last range (from latter half of year) as wrapping
    if (ranges.length > 0) {
      ranges[ranges.length - 1].wrapsYear = true
      ranges[ranges.length - 1].wrappedEnd = janEnd
    }
  }

  return ranges
}

function formatDateRange(monthStart, monthEnd) {
  // Use actual calendar days: 1st to last day of month
  const startDay = 1
  const endDay = DAYS_IN_MONTH[monthEnd % 12]
  
  const startMonth = MONTHS[monthStart % 12]
  const endMonth = MONTHS[monthEnd % 12]
  
  const startStr = `${startMonth} ${String(startDay).padStart(2, '0')}`
  const endStr = `${endMonth} ${String(endDay).padStart(2, '0')}`
  
  return `${startStr} - ${endStr}`
}

function getColorForGroup(index) {
  return COLORS[index % COLORS.length]
}

// Calculate the maximum month span needed across all records
function calculateMaxMonthSpan(records) {
  let maxMonthsNeeded = 12  // At minimum, show 12 months
  
  records.forEach(record => {
    if (record.month_mask) {
      const ranges = extractMonthRanges(record.month_mask)
      
      // Check each range to find the maximum span
      ranges.forEach(range => {
        if (range.wrapped && !range.isWrapped) {
          // This range wraps to next year. Find its paired isWrapped range
          const wrappedPair = ranges.find(r => r.isWrapped)
          if (wrappedPair) {
            // Range: e.g., Oct(9) to Dec(11) wrapped to Jan(0) to Mar(2)
            // Months needed in 24-month system: 
            // From month 9 to month 12+2 = need 15 slots (0-14)
            const monthsSpanned = 12 + wrappedPair.end + 1
            maxMonthsNeeded = Math.max(maxMonthsNeeded, monthsSpanned)
          }
        }
      })
    }
  })
  
  // Minimum 12 months, maximum 24
  return Math.min(maxMonthsNeeded, 24)
}

export default function GanttChart({ filterResults, groupingColumns, onBack }) {
  const [zoomLevel, setZoomLevel] = useState('month')
  const [editingRowId, setEditingRowId] = useState(null)
  const [editingMask, setEditingMask] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [sortByCropProcess, setSortByCropProcess] = useState(null)
  const [columnWidth, setColumnWidth] = useState(60)
  const [fieldColumnWidth, setFieldColumnWidth] = useState(140)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState(0)
  const [resizingType, setResizingType] = useState(null) // 'month' or 'field'

  // Ensure ONLY harvesting records are displayed - remove any sowing/planting
  const allRecords = filterResults?.records || []
  const records = useMemo(() => {
    return allRecords.filter(record => {
      const cropProcess = record.cropProcess || record.crop_process || ''
      return cropProcess.toLowerCase().includes('harvesting')
    })
  }, [allRecords])
  
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

  // Calculate dynamic month span
  const dynamicMonthCount = useMemo(() => {
    return calculateMaxMonthSpan(records)
  }, [records])

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

  const cellHeight = 60

  const handleMouseDown = (e, type = 'month') => {
    setIsResizing(true)
    setResizeStart(e.clientX)
    setResizingType(type)
  }

  const handleMouseMove = (e) => {
    if (!isResizing || !resizingType) return
    
    const diff = e.clientX - resizeStart
    const minWidth = 30
    
    if (resizingType === 'month') {
      const newWidth = Math.max(minWidth, columnWidth + diff)
      setColumnWidth(newWidth)
    } else if (resizingType === 'field') {
      const newWidth = Math.max(minWidth, fieldColumnWidth + diff)
      setFieldColumnWidth(newWidth)
    }
    
    setResizeStart(e.clientX)
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    setResizingType(null)
  }

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, columnWidth, fieldColumnWidth, resizeStart, resizingType])

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
            Interactive month-grid showing harvest periods ({dynamicMonthCount} months) grouped by <strong>{groupingColumnArray.join(' + ')}</strong>
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
          <div className="flex space-x-2 flex-wrap">
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

            <ExportPanel
              records={records}
              ganttElementId="gantt-table-container"
              groupingColumns={groupingColumnArray}
              filterColumn={filterColumn}
              groupedData={groupedRecords}
              dynamicMonthCount={dynamicMonthCount}
              columnWidth={columnWidth}
            />
          </div>

          <div className="text-sm text-gray-600 space-y-1 text-right">
            <div><strong>{groupNames.length}</strong> group{groupNames.length !== 1 ? 's' : ''} ({records.length} record{records.length !== 1 ? 's' : ''})</div>
            <div className="text-xs text-gray-500">💡 Drag column border to resize • 📥 Export data in multiple formats</div>
          </div>
        </div>
      </div>

      {/* Gantt Table with Dynamic Columns */}
      <div id="gantt-table-container" className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="inline-block min-w-full" style={{ cursor: isResizing ? 'col-resize' : 'default' }}>
          {/* Header row */}
          <div className="flex border-b border-gray-300 bg-gray-50">
            {/* Field column headers */}
            {groupingColumnArray.map((col, idx) => (
              <div
                key={`header-${idx}`}
                className="font-bold text-gray-900 text-sm border-r border-gray-300 bg-gray-100 flex items-center justify-center relative group"
                style={{ width: fieldColumnWidth, height: 50 }}
              >
                <div className="truncate px-2">{col}</div>
                {idx < groupingColumnArray.length - 1 && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize group-hover:bg-blue-500 transition"
                    onMouseDown={(e) => handleMouseDown(e, 'field')}
                  ></div>
                )}
              </div>
            ))}

            {/* Month/Quarter headers - DYNAMIC COUNT */}
            {Array.from({ length: dynamicMonthCount }).map((_, cellIdx) => {
              const monthIdx = cellIdx % 12
              const yearOffset = Math.floor(cellIdx / 12)
              const month = MONTHS[monthIdx]
              const label = yearOffset > 0 ? `${month} Y+${yearOffset}` : month
              
              return (
                <div
                  key={`month-${cellIdx}`}
                  className="text-center font-semibold text-gray-700 text-xs bg-gray-100 flex items-center justify-center relative group select-none"
                  style={{ width: columnWidth, height: 50, minWidth: columnWidth, borderRight: '2px solid #d1d5db' }}
                >
                  {label}
                  {cellIdx < dynamicMonthCount - 1 && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize group-hover:bg-blue-500 transition"
                      onMouseDown={handleMouseDown}
                    ></div>
                  )}
                </div>
              )
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
                    className="text-sm text-gray-900 border-r border-gray-200 flex items-center px-3 font-medium bg-gray-50 min-w-0"
                    style={{ width: fieldColumnWidth, height: cellHeight, lineHeight: '1.4' }}
                  >
                    <div className="flex items-center space-x-2 w-full min-w-0">
                      {colIdx === 0 && (
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: getColorForGroup(groupIdx) }}
                        ></div>
                      )}
                      <span 
                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                        title={fields[col]}
                        style={{ fontSize: '0.875rem', lineHeight: '1.4' }}
                      >
                        {fields[col]}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Gantt bars - DYNAMIC MONTH COUNT */}
                {groupRecords.map((record, recordIdx) => (
                  <div
                    key={`${groupKey}-bar-${recordIdx}`}
                    className="relative flex items-center bg-white"
                    style={{ width: columnWidth * dynamicMonthCount, height: cellHeight, minWidth: columnWidth * dynamicMonthCount }}
                    onMouseEnter={() => setHoveredRow(`${groupKey}-${recordIdx}`)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Grid lines for each month */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: dynamicMonthCount }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          style={{ width: columnWidth, borderRight: '2px solid #e5e7eb' }}
                        ></div>
                      ))}
                    </div>

                    {/* Month mask bars */}
                    <div className="absolute inset-0 flex items-center p-1">
                      {record.month_mask ? (
                        (() => {
                          const allRanges = extractMonthRanges(record.month_mask)
                          
                          return allRanges.map((range, renderIdx) => {
                            if (range.wrapsYear && range.wrappedEnd !== undefined) {
                              // Year-wrapping range: Oct-Mar becomes Oct(9) to Dec(11) then Jan(0) to Mar(2)
                              // In 24-month view: positions 9-14 (9,10,11 from year 1, then 12,13,14 for Jan,Feb,Mar of year 2)
                              const barStart = range.start
                              const barEnd = 12 + range.wrappedEnd
                              const barWidth = (barEnd - barStart + 1) * columnWidth - 8
                              const barLeft = barStart * columnWidth + 4
                              const dateRange = record.period || `${MONTHS[range.start]} - ${MONTHS[range.wrappedEnd]}`
                              
                              return (
                                <div
                                  key={renderIdx}
                                  className="absolute h-8 rounded shadow-sm hover:shadow-md transition cursor-pointer group"
                                  style={{
                                    backgroundColor: getColorForGroup(groupIdx),
                                    opacity: hoveredRow === `${groupKey}-${recordIdx}` ? 1 : 0.7,
                                    width: barWidth,
                                    left: barLeft,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    minWidth: 40
                                  }}
                                  onClick={() => {
                                    setEditingRowId(`${groupKey}-${recordIdx}`)
                                    setEditingMask(record.month_mask)
                                  }}
                                >
                                  {hoveredRow === `${groupKey}-${recordIdx}` && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                      {dateRange} (wraps year)
                                    </div>
                                  )}
                                </div>
                              )
                            } else {
                              // Normal non-wrapping range - render each in correct position
                              const barStart = range.start
                              const barEnd = range.end
                              const barWidth = (barEnd - barStart + 1) * columnWidth - 8
                              const barLeft = barStart * columnWidth + 4
                              const dateRange = record.period || formatDateRange(range.start, range.end)
                              
                              return (
                                <div
                                  key={renderIdx}
                                  className="absolute h-8 rounded shadow-sm hover:shadow-md transition cursor-pointer group"
                                  style={{
                                    backgroundColor: getColorForGroup(groupIdx),
                                    opacity: hoveredRow === `${groupKey}-${recordIdx}` ? 1 : 0.7,
                                    width: barWidth,
                                    left: barLeft,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    minWidth: 40
                                  }}
                                  onClick={() => {
                                    setEditingRowId(`${groupKey}-${recordIdx}`)
                                    setEditingMask(record.month_mask)
                                  }}
                                >
                                  {hoveredRow === `${groupKey}-${recordIdx}` && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                      {dateRange}
                                    </div>
                                  )}
                                </div>
                              )
                            }
                          })
                        })()
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
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {String(val).substring(0, 30)}
                              </div>
                            )
                          })}
                          {record.month_mask && (
                            <div className="text-xs">
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
          💡 <strong>Column widths:</strong> Drag the border between any two month columns to resize. Columns expand automatically based on your data's maximum span.
        </p>
        <p className="text-blue-900 text-sm">
          📅 <strong>Dynamic months:</strong> Showing {dynamicMonthCount} months. If data spans across year boundary (Dec→Feb), months display as "Jan Y+1", "Feb Y+1", etc.
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
