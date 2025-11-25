import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Fuse from 'fuse.js'
import { Toaster, toast } from 'sonner'

export default function GroupSelector({ uploadId, onFilterApply, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [columns, setColumns] = useState([])
  const [selectedColumn, setSelectedColumn] = useState(null)
  const [uniqueValues, setUniqueValues] = useState([])
  const [selectedValues, setSelectedValues] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [useFuzzyMerge, setUseFuzzyMerge] = useState(false)
  const [filtering, setFiltering] = useState(false)

  const getApiUrl = () => {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    const protocol = window.location.protocol
    const host = window.location.hostname
    return `${protocol}//${host}:8000`
  }

  // Load available columns
  useEffect(() => {
    const loadColumns = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const apiUrl = getApiUrl()
        const response = await axios.get(
          `${apiUrl}/api/upload/${uploadId}/group-columns`
        )
        
        setColumns(response.data.columns || [])
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load columns')
        toast.error('Failed to load columns')
      } finally {
        setLoading(false)
      }
    }

    loadColumns()
  }, [uploadId])

  // Load unique values when column changes
  useEffect(() => {
    if (!selectedColumn) return

    const loadUniqueValues = async () => {
      try {
        setError(null)
        
        const apiUrl = getApiUrl()
        const response = await axios.get(
          `${apiUrl}/api/upload/${uploadId}/unique-values/${selectedColumn}`
        )
        
        setUniqueValues(response.data.unique_values || [])
        setSelectedValues(new Set())
        setSearchQuery('')
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load unique values')
        toast.error('Failed to load unique values')
      }
    }

    loadUniqueValues()
  }, [selectedColumn, uploadId])

  // Fuzzy search/filter unique values
  const filteredValues = useMemo(() => {
    if (!searchQuery) {
      return uniqueValues
    }

    const fuse = new Fuse(uniqueValues, {
      keys: ['value'],
      threshold: 0.3,
      minMatchCharLength: 2
    })

    return fuse.search(searchQuery).map(result => result.item)
  }, [uniqueValues, searchQuery])

  // Handle value toggle
  const handleToggleValue = (value) => {
    const newSelected = new Set(selectedValues)
    if (newSelected.has(value)) {
      newSelected.delete(value)
    } else {
      newSelected.add(value)
    }
    setSelectedValues(newSelected)
  }

  // Select all visible
  const handleSelectAll = () => {
    const newSelected = new Set(selectedValues)
    filteredValues.forEach(item => newSelected.add(item.value))
    setSelectedValues(newSelected)
  }

  // Deselect all
  const handleClearAll = () => {
    setSelectedValues(new Set())
  }

  // Apply filter
  const handleApplyFilter = async () => {
    if (!selectedColumn || selectedValues.size === 0) {
      toast.error('Please select a column and at least one value')
      return
    }

    try {
      setFiltering(true)
      setError(null)

      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/api/upload/${uploadId}/filter`,
        {
          column_name: selectedColumn,
          values: Array.from(selectedValues)
        }
      )

      if (response.data.success) {
        toast.success(`Filtered ${response.data.total_records} records`, {
          description: `Column: ${selectedColumn} • Values: ${selectedValues.size}`,
          duration: 3000
        })
        onFilterApply(response.data)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to apply filter'
      setError(errorMsg)
      toast.error('Filter failed', { description: errorMsg })
    } finally {
      setFiltering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading group options...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="light" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Group & Filter Data</h2>
          <p className="text-gray-600 text-sm mt-1">Select a column and values to filter records</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Column selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Column</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {columns.map((col, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedColumn(col.name)}
              className={`px-4 py-3 rounded-lg border-2 transition font-medium text-sm ${
                selectedColumn === col.name
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{col.name}</div>
              <div className="text-xs opacity-75">{col.unique_values} unique</div>
            </button>
          ))}
        </div>
      </div>

      {/* Value selector */}
      {selectedColumn && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Step 2: Select Values from "{selectedColumn}"
          </h3>

          {/* Search box */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Search values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fuzzy merge toggle */}
          <div className="mb-4 flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFuzzyMerge}
                onChange={(e) => setUseFuzzyMerge(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">
                🔀 Fuzzy merge similar names
              </span>
            </label>
          </div>

          {/* Quick actions */}
          <div className="mb-4 flex space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition font-medium"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition font-medium"
            >
              Clear All
            </button>
            <div className="flex-1"></div>
            <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded text-sm font-medium">
              {selectedValues.size} selected
            </span>
          </div>

          {/* Values list */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg divide-y">
            {filteredValues.length > 0 ? (
              filteredValues.map((item, idx) => (
                <label key={idx} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.has(item.value)}
                    onChange={() => handleToggleValue(item.value)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="flex-1 text-gray-900">{item.value}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {item.count}
                  </span>
                </label>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No values match your search
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply filter button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleApplyFilter}
          disabled={!selectedColumn || selectedValues.size === 0 || filtering}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          {filtering ? '⏳ Filtering...' : '🎯 Apply Filter'}
        </button>
      </div>
    </div>
  )
}
