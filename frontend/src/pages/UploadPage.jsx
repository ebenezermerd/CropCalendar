import React, { useState } from 'react'
import FileUpload from '../components/FileUpload'
import UploadStatus from '../components/UploadStatus'
import PreviewTable from '../components/PreviewTable'

export default function UploadPage({ onUploadComplete }) {
  const [uploadData, setUploadData] = useState(null)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleUploadComplete = (data) => {
    setUploadData(data)
    setError(null)
    setShowPreview(true)
    onUploadComplete(data)
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setUploadData(null)
    setShowPreview(false)
  }

  const handleNewUpload = () => {
    setUploadData(null)
    setError(null)
    setShowPreview(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Crop Calendar Gantt
          </h1>
          <p className="text-lg text-gray-600">
            Upload your agricultural data and generate beautiful Gantt charts
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-red-600 text-xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-900">Upload Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!showPreview ? (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Upload Your Data
            </h2>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          </div>
        ) : (
          <>
            {/* Upload Status */}
            <div className="mb-8">
              <UploadStatus uploadData={uploadData} />
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Data Preview
                </h2>
                <button
                  onClick={handleNewUpload}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                >
                  Upload Another File
                </button>
              </div>

              <PreviewTable
                columns={uploadData.columns}
                rows={uploadData.preview_rows}
                detectedColumns={uploadData.detected_columns}
              />
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                ✓ Next Steps
              </h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>
                  <span className="font-medium">1. Verify Columns:</span> Review
                  the detected column types above
                </li>
                <li>
                  <span className="font-medium">2. Adjust Mappings:</span> If
                  auto-detection needs adjustment, you can customize in the next
                  step
                </li>
                <li>
                  <span className="font-medium">3. Proceed to Analysis:</span>{' '}
                  Click "Next" to continue with column mapping and parsing
                </li>
              </ol>
              <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                Next: Configure Columns
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
