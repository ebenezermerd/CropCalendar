import React, { useState, useEffect } from 'react'
import axios from 'axios'
import LoadingSpinner from './LoadingSpinner'

export default function UploadHistory({ onSelectUpload }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getApiUrl = () => {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    const protocol = window.location.protocol
    const host = window.location.hostname
    return `${protocol}//${host}:8000`
  }

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const apiUrl = getApiUrl()
        const response = await axios.get(`${apiUrl}/api/upload-history`)
        setHistory(response.data.history || [])
        setError(null)
      } catch (err) {
        setError('Failed to load upload history')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner message="Loading upload history..." size="md" />
      </div>
    )
  }

  if (history.length === 0) {
    return null
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Previous Uploads</h2>
      <p className="text-gray-600 text-sm mb-4">Click any file to continue working with it</p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Filename</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rows</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.filename}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {item.file_type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.total_rows.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.created_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelectUpload(item.upload_id, item)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium"
                  >
                    Load
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
