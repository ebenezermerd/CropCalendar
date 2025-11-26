import React from 'react'

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, isLoading = false, confirmText = 'Delete', cancelText = 'Cancel' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 text-sm mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
            >
              {isLoading ? '⏳ ' : ''}{confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
