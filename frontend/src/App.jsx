import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import ColumnMapping from './components/ColumnMapping'
import ParsingResults from './components/ParsingResults'
import GroupSelector from './components/GroupSelector'
import GanttChart from './components/GanttChart'
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
    // Mapping saved successfully - move to parsing
    setUploadData(prev => ({
      ...prev,
      column_mappings: mappings
    }))
    setCurrentStep('parsing')
  }

  const handleBackFromMapping = () => {
    setCurrentStep('upload')
  }

  const handleBackFromParsing = () => {
    setCurrentStep('column-mapping')
  }

  const handleParsingComplete = (results) => {
    // Parsing finished - move to filtering
    setUploadData(prev => ({
      ...prev,
      parsing_results: results
    }))
    setCurrentStep('filtering')
  }

  const handleBackFromFiltering = () => {
    setCurrentStep('parsing')
  }

  const handleBackFromGantt = () => {
    setCurrentStep('filtering')
  }

  const handleFilterApply = (filterResults) => {
    // Filter applied successfully
    setUploadData(prev => ({
      ...prev,
      filter_results: filterResults
    }))
    setCurrentStep('gantt')
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
      {currentStep === 'parsing' && uploadData && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <ParsingResults
              uploadId={uploadData.upload_id}
              onParsingComplete={handleParsingComplete}
              onBack={handleBackFromParsing}
            />
          </div>
        </div>
      )}
      {currentStep === 'filtering' && uploadData && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <GroupSelector
              uploadId={uploadData.upload_id}
              onFilterApply={handleFilterApply}
              onBack={handleBackFromFiltering}
            />
          </div>
        </div>
      )}
      {currentStep === 'gantt' && uploadData?.filter_results && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-full mx-auto px-4 py-12">
            <GanttChart
              filterResults={uploadData.filter_results}
              onBack={handleBackFromGantt}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default App
