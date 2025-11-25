import React, { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'

export default function GanttColumnSelector({ filterResults, onColumnSelect, onBack }) {
  const [selectedColumn, setSelectedColumn] = useState(null)
  
  const records = filterResults?.records || []
  const filterColumn = filterResults?.filter?.column
  
  // Get all available columns for grouping
  const availableColumns = useMemo(() => {
    if (!records.length) return []
    
    const firstRecord = records[0]
    return Object.keys(firstRecord)
      .filter(key => !key.startsWith('_') && key !== 'month_mask' && key !== 'parsed_data')
      .sort()
  }, [records])

  const handleSelectColumn = (column) => {
    setSelectedColumn(column)
    
    // Show preview of what will be grouped
    const uniqueValues = new Set(records.map(r => r[column]))
    toast.success(`Selected: ${column}`, {
      description: `Will show ${uniqueValues.size} unique value${uniqueValues.size !== 1 ? 's' : ''} in Gantt view`,
      duration: 2000
    })
  }

  const handleProceedToGantt = () => {
    if (!selectedColumn) {
      toast.error('Please select a column for Gantt visualization')
      return
    }
    onColumnSelect(selectedColumn)
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="light" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gantt Visualization Setup</h2>
          <p className="text-gray-600 text-sm mt-1">
            Choose a column to group your data by in the Gantt chart
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
        >
          Back
        </button>
      </div>

      {/* Filter Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <p className="font-semibold text-blue-900">Filtered Data Ready</p>
            <p className="text-sm text-blue-700">
              {records.length} record{records.length !== 1 ? 's' : ''} filtered by {filterColumn}
            </p>
          </div>
        </div>
      </div>

      {/* Column Selection Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Grouping Column</h3>
        <p className="text-gray-600 text-sm mb-6">
          Each unique value in this column will appear as a row in the Gantt chart, with colored bars showing harvest periods
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {availableColumns.map((column, idx) => {
            const uniqueCount = new Set(records.map(r => r[column])).size
            const isSelected = selectedColumn === column
            
            return (
              <button
                key={idx}
                onClick={() => handleSelectColumn(column)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer group ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className={`text-sm font-bold mb-2 group-hover:text-blue-600 ${
                  isSelected ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {column}
                </div>
                <div className={`text-xs ${
                  isSelected ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {uniqueCount} unique
                </div>
                
                {/* Checkmark for selected */}
                {isSelected && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {selectedColumn && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-900 font-medium">
              📊 Preview: Gantt will display {new Set(records.map(r => r[selectedColumn])).size} group{new Set(records.map(r => r[selectedColumn])).size !== 1 ? 's' : ''} from "{selectedColumn}" column
            </p>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-900 text-sm">
          💡 <strong>Tip:</strong> Each selected column will group your filtered data differently. For example, select "Country" to see harvest periods grouped by country with different colors for each country's records.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleProceedToGantt}
          disabled={!selectedColumn}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Proceed to Gantt 📊
        </button>
      </div>
    </div>
  )
}
