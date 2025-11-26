import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import LoadingSpinner from './LoadingSpinner'

export default function UploadHistory({ onSelectUpload }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const getApiUrl = () => {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    const protocol = window.location.protocol
    const host = window.location.hostname
    return `${protocol}//${host}:8000`
  }

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/api/upload-history`)
      setHistory(response.data.history || [])
      setError(null)
      setSelectedIds(new Set())
    } catch (err) {
      setError('Failed to load upload history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDelete = async (uploadId) => {
    if (!window.confirm('Delete this upload?')) return
    
    try {
      setDeleting(true)
      const apiUrl = getApiUrl()
      await axios.delete(`${apiUrl}/api/upload/${uploadId}`)
      toast.success('Upload deleted')
      fetchHistory()
    } catch (err) {
      toast.error('Failed to delete upload')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('No uploads selected')
      return
    }
    
    if (!window.confirm(`Delete ${selectedIds.size} upload(s)?`)) return
    
    try {
      setDeleting(true)
      const apiUrl = getApiUrl()
      await axios.post(`${apiUrl}/api/delete-uploads`, { ids: Array.from(selectedIds) })
      toast.success(`Deleted ${selectedIds.size} upload(s)`)
      fetchHistory()
    } catch (err) {
      toast.error('Failed to delete uploads')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelect = (uploadId) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(uploadId)) {
      newSelected.delete(uploadId)
    } else {
      newSelected.add(uploadId)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(history.map(h => h.upload_id)))
    }
  }

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📋 Previous Uploads</h2>
          <p className="text-gray-600 text-sm">Click Load to continue working with it, or select and delete</p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 text-sm"
          >
            🗑️ Delete {selectedIds.size} ({deleting ? 'deleting...' : 'ready'})
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === history.length && history.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Filename</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rows</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => (
              <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 transition ${selectedIds.has(item.upload_id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.upload_id)}
                    onChange={() => toggleSelect(item.upload_id)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.filename}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {item.file_type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.total_rows.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.created_at)}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => onSelectUpload(item.upload_id, item)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium inline-block"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(item.upload_id)}
                    disabled={deleting}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition font-medium disabled:opacity-50 inline-block"
                  >
                    Delete
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
