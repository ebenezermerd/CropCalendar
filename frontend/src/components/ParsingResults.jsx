import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Toaster, toast } from 'sonner'
import LoadingSpinner from './LoadingSpinner'

export default function ParsingResults({ uploadId, onParsingComplete, onBack }) {
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [stats, setStats] = useState(null)

  const getApiUrl = () => {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    const protocol = window.location.protocol
    const host = window.location.hostname
    return `${protocol}//${host}:8000`
  }

  // Start parsing
  const handleStartParsing = async () => {
    try {
      setParsing(true)
      setError(null)
      
      toast.loading('Parsing and normalizing data...', {
        id: 'parsing',
        duration: Infinity
      })
      
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/api/upload/${uploadId}/parse`
      )
      
      if (response.data.success) {
        setResults(response.data)
        setStats(response.data.stats)
        
        toast.dismiss('parsing')
        toast.success('Parsing completed!', {
          description: `Processed ${response.data.stats.total_parsed} records`,
          duration: 3000
        })
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to parse data'
      setError(errorMsg)
      toast.dismiss('parsing')
      toast.error('Parsing failed', {
        description: errorMsg,
        duration: 4000
      })
    } finally {
      setParsing(false)
    }
  }

  if (parsing && !results) {
    return (
      <div className="space-y-6">
        <Toaster position="top-right" theme="light" />
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <LoadingSpinner message="Parsing data and generating month masks..." size="lg" />
            <p className="text-sm text-gray-500 mt-4">This may take a moment for large files</p>
          </div>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="space-y-6">
        <Toaster position="top-right" theme="light" />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parse & Normalize Data</h2>
            <p className="text-gray-600 text-sm mt-1">Extract month information and generate month masks</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Parse</h3>
            <p className="text-gray-600 mb-6">Your column mappings are configured. Click below to parse the entire file and extract month/season information.</p>
            <button
              onClick={handleStartParsing}
              disabled={parsing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              🚀 Start Parsing
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="light" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Parsing Results</h2>
          <p className="text-gray-600 text-sm mt-1">Data parsed and normalized with month masks generated</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
          >
            Back
          </button>
          <button
            onClick={onParsingComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            Next: Visualize →
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Records</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_parsed}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Parsed Successfully</div>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Requires Review</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.manual_review}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Errors</div>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          </div>
        </div>
      )}

      {/* Sample parsed records */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Parsed Records (First 5)</h3>
        <div className="space-y-4">
          {results.sample_records && results.sample_records.slice(0, 5).map((record, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Crop:</span>
                  <span className="font-medium ml-2">{record.crop_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Country:</span>
                  <span className="font-medium ml-2">{record.country}</span>
                </div>
                <div>
                  <span className="text-gray-600">Month Mask:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded ml-2">{record.month_mask.toString(2).padStart(12, '0')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Months:</span>
                  <span className="font-medium ml-2">{record.parsed_months}</span>
                </div>
                {record.requires_review && (
                  <div className="col-span-2 text-yellow-700 bg-yellow-50 px-3 py-2 rounded text-xs">
                    ⚠️ Requires manual review: {record.review_reason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About month masks */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>📚 Month Masks:</strong> Each bit represents a month (Jan=1, Feb=2, ... Dec=4096). 
          Binary format shows active months. For example, 000001000001 = Jan + Aug.
        </p>
      </div>
    </div>
  )
}
