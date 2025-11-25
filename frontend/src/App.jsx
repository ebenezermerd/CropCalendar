import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Crop Calendar Gantt</h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-6">Upload your crop data file to get started:</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition cursor-pointer">
              <p className="text-gray-500">Drag and drop your file here, or click to select</p>
              <p className="text-sm text-gray-400 mt-2">Supported formats: CSV, XLSX, XML</p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">Frontend is running in development mode. Backend integration coming soon.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
