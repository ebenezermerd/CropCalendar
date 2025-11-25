import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import './App.css'

function App() {
  const [uploadData, setUploadData] = useState(null)
  const [currentStep, setCurrentStep] = useState('upload')

  const handleUploadComplete = (data) => {
    setUploadData(data)
    // Keep on upload page to show preview
  }

  return (
    <>
      {currentStep === 'upload' && (
        <UploadPage onUploadComplete={handleUploadComplete} />
      )}
    </>
  )
}

export default App
