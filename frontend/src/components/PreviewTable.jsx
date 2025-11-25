import React, { useState } from 'react'

export default function PreviewTable({ columns, rows, detectedColumns, onColumnDetectionUpdate }) {
  const [displayedColumns, setDisplayedColumns] = useState(columns)

  const getColumnTypeColor = (type) => {
    const colors = {
      'crop_name': 'bg-green-100 text-green-800',
      'country': 'bg-blue-100 text-blue-800',
      'season': 'bg-purple-100 text-purple-800',
      'harvest_calendar': 'bg-orange-100 text-orange-800',
      'start_date': 'bg-yellow-100 text-yellow-800',
      'end_date': 'bg-red-100 text-red-800',
      null: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || colors[null]
  }

  const getColumnTypeName = (type) => {
    const names = {
      'crop_name': 'Crop Name',
      'country': 'Country',
      'season': 'Season',
      'harvest_calendar': 'Harvest Calendar',
      'start_date': 'Start Date',
      'end_date': 'End Date',
      null: 'Unknown'
    }
    return names[type] || type
  }

  return (
    <div className="w-full">
      {/* Column Headers with Detection */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Detected Column Types
        </h3>
        <div className="flex flex-wrap gap-2">
          {columns.map((col) => (
            <div key={col} className="flex flex-col gap-1">
              <div className="text-xs font-medium text-gray-600 truncate max-w-xs">
                {col}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${getColumnTypeColor(
                  detectedColumns[col]
                )}`}
              >
                {getColumnTypeName(detectedColumns[col])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50 w-12">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                  {rowIdx + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={`${rowIdx}-${col}`}
                    className="px-4 py-3 text-xs text-gray-900 max-w-xs truncate"
                    title={row[col]}
                  >
                    {row[col] || (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing {rows.length} rows of preview data
      </div>
    </div>
  )
}
