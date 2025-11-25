import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import ColumnMapping from './components/ColumnMapping'
import './App.css'

function App() {
  const [uploadData, setUploadData] = useState(null)
  const [currentStep, setCurrentStep] = useState('upload')

  const handleUploadComplete = (data) => {
    setUploadData(data)
    // Keep on upload page to show preview
  }

  const handleColumnMappingStart = (data) => {
    setUploadData(data)
    setCurrentStep('column-mapping')
  }

  const handleMappingComplete = (mappings) => {
    // Mapping saved successfully
    setUploadData(prev => ({
      ...prev,
      column_mappings: mappings
    }))
    // Next step would be parsing/visualization (future)
  }

  const handleBackFromMapping = () => {
    setCurrentStep('upload')
  }

  return (
    <>
      {currentStep === 'upload' && (
        <UploadPage 
          onUploadComplete={handleUploadComplete}
          onColumnMappingStart={handleColumnMappingStart}
        />
      )}
      {currentStep === 'column-mapping' && uploadData && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <ColumnMapping
              uploadId={uploadData.upload_id}
              onMappingComplete={handleMappingComplete}
              onBack={handleBackFromMapping}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default App
