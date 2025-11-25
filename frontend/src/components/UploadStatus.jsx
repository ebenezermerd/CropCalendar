import React from 'react'

export default function UploadStatus({ uploadData }) {
  const getFileTypeIcon = (fileType) => {
    const icons = {
      csv: '📄',
      excel: '📊',
      xml: '🔗'
    }
    return icons[fileType] || '📁'
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="text-3xl">{getFileTypeIcon(uploadData.file_type)}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">File Uploaded Successfully</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Filename</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {uploadData.filename}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">File Type</p>
              <p className="text-sm font-medium text-gray-900">
                {uploadData.file_type.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Rows</p>
              <p className="text-sm font-medium text-gray-900">
                {uploadData.total_rows.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Columns</p>
              <p className="text-sm font-medium text-gray-900">
                {uploadData.columns.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
