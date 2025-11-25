import React, { useState, useMemo } from 'react'
import { Toaster, toast } from 'sonner'

export default function GanttColumnSelector({ filterResults, onColumnSelect, onBack }) {
  const [selectedColumns, setSelectedColumns] = useState([])
  
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

  const handleToggleColumn = (column) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column)
      } else {
        return [...prev, column]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedColumns.length === availableColumns.length) {
      setSelectedColumns([])
    } else {
      setSelectedColumns([...availableColumns])
    }
  }

  const calculateUniqueGroupCombinations = () => {
    if (selectedColumns.length === 0) return 0
    
    const combinations = new Set()
    records.forEach(record => {
      const key = selectedColumns.map(col => record[col] || 'Unknown').join(' | ')
      combinations.add(key)
    })
    return combinations.size
  }

  const handleProceedToGantt = () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column for Gantt visualization')
      return
    }
    
    const combos = calculateUniqueGroupCombinations()
    toast.success(`Grouping by ${selectedColumns.length} column${selectedColumns.length !== 1 ? 's' : ''}`, {
      description: `Will display ${combos} unique group${combos !== 1 ? 's' : ''} in Gantt view`,
      duration: 2000
    })
    
    setTimeout(() => {
      onColumnSelect(selectedColumns)
    }, 500)
  }

  const uniqueCombos = calculateUniqueGroupCombinations()

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="light" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gantt Grouping Configuration</h2>
          <p className="text-gray-600 text-sm mt-1">
            Select one or more columns to organize your Gantt visualization
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

      {/* Column Selection Area */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
        {/* Header with Select All */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Available Columns</h3>
            <p className="text-gray-600 text-sm mt-1">
              Select columns to create hierarchical grouping in Gantt view
            </p>
          </div>
          <button
            onClick={handleSelectAll}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
              selectedColumns.length === availableColumns.length
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {selectedColumns.length === availableColumns.length ? 'Clear All' : 'Select All'}
          </button>
        </div>

        {/* Column Checkboxes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {availableColumns.map((column, idx) => {
            const isSelected = selectedColumns.includes(column)
            const uniqueCount = new Set(records.map(r => r[column])).size
            
            return (
              <div
                key={idx}
                onClick={() => handleToggleColumn(column)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                }`}
              >
                {/* Checkbox */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className={`text-sm font-bold ${
                    isSelected ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {column}
                  </div>
                </div>
                
                {/* Unique count */}
                <div className={`text-xs ${
                  isSelected ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {uniqueCount} unique value{uniqueCount !== 1 ? 's' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Columns Display */}
      {selectedColumns.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <div>
            <p className="text-green-900 font-semibold mb-3">📊 Grouping Configuration</p>
            
            {/* Selected columns as badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedColumns.map((col, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-white border-2 border-green-400 rounded-full"
                >
                  <span className="text-sm font-medium text-green-900">{col}</span>
                  <button
                    onClick={() => handleToggleColumn(col)}
                    className="ml-1 text-green-600 hover:text-green-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-green-800 text-sm">
                <strong>{uniqueCombos} unique group{uniqueCombos !== 1 ? 's' : ''}</strong> will appear in Gantt visualization
              </p>
              {selectedColumns.length > 1 && (
                <p className="text-green-700 text-sm">
                  🎯 Example group label: <code className="bg-green-100 px-2 py-1 rounded text-xs">
                    {records.length > 0 ? selectedColumns.map(col => `${records[0][col] || 'Unknown'}`).join(' | ') : '...'}
                  </code>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <p className="text-amber-900 text-sm">
          💡 <strong>Single Column:</strong> Group by Country → shows each country as a row
        </p>
        <p className="text-amber-900 text-sm">
          💡 <strong>Multiple Columns:</strong> Group by Country + Period → shows "Sudan | Q1", "Sudan | Q2", "Ethiopia | Q1", etc.
        </p>
        <p className="text-amber-900 text-sm">
          💡 <strong>Professional Use:</strong> Country + Period + Crop Process creates detailed hierarchical grouping
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
          disabled={selectedColumns.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Proceed to Gantt 📊</span>
          {selectedColumns.length > 0 && (
            <span className="bg-blue-500 px-2 py-0.5 rounded-full text-xs font-bold">
              {selectedColumns.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
