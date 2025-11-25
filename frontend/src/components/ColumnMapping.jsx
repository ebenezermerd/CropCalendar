import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Toaster, toast } from 'sonner'

export default function ColumnMapping({ uploadId, onMappingComplete, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mappingData, setMappingData] = useState(null)
  const [mappings, setMappings] = useState({})
  const [saving, setSaving] = useState(false)

  // Get API base URL
  const getApiUrl = () => {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    const protocol = window.location.protocol
    const host = window.location.hostname
    return `${protocol}//${host}:8000`
  }

  // Load mapping data
  useEffect(() => {
    const loadMappingData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const apiUrl = getApiUrl()
        const response = await axios.get(
          `${apiUrl}/api/upload/${uploadId}/column-mapping`
        )
        
        setMappingData(response.data)
        
        // Initialize mappings with detected types
        const initialMappings = {}
        response.data.columns.forEach(col => {
          initialMappings[col.name] = col.detected_type || 'ignore'
        })
        setMappings(initialMappings)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load column mapping data')
      } finally {
        setLoading(false)
      }
    }

    loadMappingData()
  }, [uploadId])

  // Handle mapping change
  const handleMappingChange = (columnName, newType) => {
    setMappings(prev => ({
      ...prev,
      [columnName]: newType
    }))
  }

  // Re-detect columns
  const handleAutoDetect = async () => {
    try {
      setError(null)
      
      const apiUrl = getApiUrl()
      const response = await axios.get(
        `${apiUrl}/api/upload/${uploadId}/column-mapping`
      )
      
      const initialMappings = {}
      response.data.columns.forEach(col => {
        initialMappings[col.name] = col.detected_type || 'ignore'
      })
      setMappings(initialMappings)
    } catch (err) {
      setError('Failed to re-detect columns')
    }
  }

  // Save mappings
  const handleSaveMappings = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/api/upload/${uploadId}/save-mappings`,
        mappings
      )
      
      if (response.data.success) {
        toast.success('Column mappings saved successfully!', {
          description: `${Object.keys(mappings).length} columns configured`,
          duration: 3000
        })
        setTimeout(() => {
          onMappingComplete(mappings)
        }, 500)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to save mappings'
      setError(errorMsg)
      toast.error('Failed to save mappings', {
        description: errorMsg,
        duration: 4000
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading column mapping...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="text-red-600 text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Column Mapping</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
        >
          Back
        </button>
      </div>
    )
  }

  if (!mappingData) {
    return null
  }

  // Count mapped columns
  const mappedCount = Object.values(mappings).filter(m => m !== 'ignore').length

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="light" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configure Column Mapping</h2>
          <p className="text-gray-600 text-sm mt-1">
            Map your columns to the appropriate data types • {mappedCount} columns mapped
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAutoDetect}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-medium text-sm disabled:opacity-50"
          >
            🔄 Auto-Detect
          </button>
          <button
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm disabled:opacity-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Column Mapping Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
          <div className="col-span-3">Column Name</div>
          <div className="col-span-3">Detected Type</div>
          <div className="col-span-6">Map To</div>
        </div>

        <div className="divide-y divide-gray-200">
          {mappingData.columns.map((column, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition">
              {/* Column Name */}
              <div className="col-span-3">
                <div className="font-medium text-gray-900">{column.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {column.sample_values.slice(0, 2).join(', ')}
                  {column.sample_values.length > 2 ? '...' : ''}
                </div>
              </div>

              {/* Detected Type with Confidence */}
              <div className="col-span-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {column.detected_type || '—'}
                  </span>
                  {column.confidence > 0 && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        column.confidence > 0.7
                          ? 'bg-green-100 text-green-700'
                          : column.confidence > 0.4
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {Math.round(column.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Dropdown for Mapping */}
              <div className="col-span-6">
                <select
                  value={mappings[column.name] || 'ignore'}
                  onChange={(e) => handleMappingChange(column.name, e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 bg-white"
                >
                  <option value="ignore">— Ignore</option>
                  <optgroup label="Agricultural Fields">
                    <option value="crop_name">🌾 Crop Name</option>
                    <option value="country">🌍 Country/Region</option>
                    <option value="season">🌤️ Season</option>
                  </optgroup>
                  <optgroup label="Date/Time Fields">
                    <option value="harvest_calendar">📅 Harvest Calendar</option>
                    <option value="start_date">📍 Start Date/Month</option>
                    <option value="end_date">📍 End Date/Month</option>
                  </optgroup>
                  <optgroup label="Temporal Metadata">
                    <option value="allYear">🔄 All Year (Year-Round)</option>
                    <option value="currentYear">📆 Current Year</option>
                  </optgroup>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Data Preview (First 20 rows)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {mappingData.columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mappingData.preview_rows.slice(0, 10).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {mappingData.columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-4 py-2 text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                      title={row[col.name] || ''}
                    >
                      {row[col.name] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Showing 10 of {mappingData.total_rows} rows
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSaveMappings}
          disabled={saving || mappedCount === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Save Mappings</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
