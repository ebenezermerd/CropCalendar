import React, { useState } from 'react'
import axios from 'axios'

export default function FileUpload({ onUploadComplete, onError }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const uploadFile = async (file) => {
    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.xml']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      onError(`Invalid file type. Allowed: CSV, XLSX, XLS, XML`)
      return
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      onError('File is too large. Maximum size is 50MB.')
      return
    }

    setIsLoading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Get the domain for API calls - handle Replit environment
      let apiUrl
      if (window.location.hostname === 'localhost') {
        apiUrl = 'http://localhost:8000'
      } else {
        // In Replit iframe, use the current origin but point to backend port
        const protocol = window.location.protocol
        const host = window.location.hostname
        apiUrl = `${protocol}//${host}:8000`
      }

      const response = await axios.post(`${apiUrl}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        }
      })

      console.log('Upload response:', response.data)

      if (response.data && response.data.success) {
        setIsLoading(false)
        onUploadComplete(response.data)
      } else if (response.data && response.data.error) {
        throw new Error(response.data.error)
      } else {
        throw new Error('Upload failed: No success response')
      }
    } catch (error) {
      setIsLoading(false)
      console.error('Upload error:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Upload failed'
      onError(errorMsg)
    }
  }

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        } ${isLoading ? 'opacity-60' : ''}`}
      >
        <input
          type="file"
          id="file-input"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
          accept=".csv,.xlsx,.xls,.xml"
        />

        {!isLoading ? (
          <label htmlFor="file-input" className="cursor-pointer block">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-4xl text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drag and drop your file here
                </p>
                <p className="text-sm text-gray-500 mt-1">or click to select</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Supported formats: CSV, XLSX, XLS, XML (Max 50MB)
              </p>
            </div>
          </label>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-gray-700 font-medium">Uploading...</p>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  )
}
