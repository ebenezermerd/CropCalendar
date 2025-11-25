import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

/**
 * Export Gantt table as Excel with visual formatting
 */
export const exportToExcelAsTable = async (
  records,
  groupedData,
  groupingColumns,
  options = {}
) => {
  const { format = 'table' } = options

  try {
    const workbook = XLSX.utils.book_new()

    if (format === 'table') {
      // Export table with formatting - grouped layout
      const tableData = []

      // Add grouping info header
      tableData.push(['CROP CALENDAR GANTT EXPORT - TABLE FORMAT'])
      tableData.push([`Export Date: ${new Date().toISOString().split('T')[0]}`])
      tableData.push([`Total Records: ${records.length}`])
      tableData.push([])

      // Add column headers
      const headers = [...groupingColumns, 'Period', 'Crop Process', 'Start', 'End', 'Notes']
      tableData.push(headers)

      // Add grouped data
      if (groupedData && Object.keys(groupedData).length > 0) {
        Object.entries(groupedData).forEach(([groupKey, groupRecords]) => {
          tableData.push([])
          tableData.push([`GROUP: ${groupKey}`])

          groupRecords.forEach(record => {
            const row = []
            groupingColumns.forEach(col => {
              row.push(record[col] || '')
            })
            row.push(record.period || '')
            row.push(record.cropProcess || '')
            row.push(record.startMonth || '')
            row.push(record.endMonth || '')
            row.push(record.notes || '')
            tableData.push(row)
          })
        })
      } else {
        // If no grouped data, just list all records
        records.forEach(record => {
          const row = []
          groupingColumns.forEach(col => {
            row.push(record[col] || '')
          })
          row.push(record.period || '')
          row.push(record.cropProcess || '')
          row.push('')
          row.push('')
          row.push(record.notes || '')
          tableData.push(row)
        })
      }

      const ws = XLSX.utils.aoa_to_sheet(tableData)

      // Apply styling
      const range = XLSX.utils.decode_range(ws['!ref'])
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_col(C) + XLSX.utils.encode_row(R)
          const cell = ws[cellAddress]

          if (!cell) continue

          // Header row styling
          if (R === 5) {
            cell.fill = { fgColor: { rgb: 'FF4CAF50' }, patternType: 'solid' }
            cell.font = { bold: true, color: { rgb: 'FFFFFFFF' } }
            cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }
          }

          // Group headers
          if (cell.v && typeof cell.v === 'string' && cell.v.startsWith('GROUP:')) {
            cell.fill = { fgColor: { rgb: 'FFE3F2FD' }, patternType: 'solid' }
            cell.font = { bold: true, color: { rgb: 'FF1976D2' } }
          }

          // Alternating row colors for data
          if (R > 5 && !cell.v?.toString().startsWith('GROUP:')) {
            if (R % 2 === 0) {
              cell.fill = { fgColor: { rgb: 'FFF5F5F5' }, patternType: 'solid' }
            }
          }
        }
      }

      // Set column widths
      ws['!cols'] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 }
      ]

      XLSX.utils.book_append_sheet(workbook, ws, 'Gantt Table')
    } else if (format === 'raw') {
      // Raw data export
      const wsData = records.map(record => {
        const { _index, month_mask, parsed_data, ...cleanRecord } = record
        return cleanRecord
      })
      const ws = XLSX.utils.json_to_sheet(wsData)
      XLSX.utils.book_append_sheet(workbook, ws, 'Raw Data')
    } else if (format === 'normalized') {
      // Normalized only
      const wsData = records
        .filter(r => r.month_mask)
        .map(record => {
          const { _index, parsed_data, ...cleanRecord } = record
          return {
            ...cleanRecord,
            month_mask: record.month_mask.toString(2).padStart(12, '0')
          }
        })
      const ws = XLSX.utils.json_to_sheet(wsData)
      XLSX.utils.book_append_sheet(workbook, ws, 'Normalized')
    } else if (format === 'byCountry') {
      // One sheet per country
      const groupedByCountry = {}
      records.forEach(record => {
        const country = record.countryName || 'Unknown'
        if (!groupedByCountry[country]) {
          groupedByCountry[country] = []
        }
        const { _index, parsed_data, ...cleanRecord } = record
        groupedByCountry[country].push(cleanRecord)
      })

      Object.entries(groupedByCountry).forEach(([country, countryRecords]) => {
        const ws = XLSX.utils.json_to_sheet(countryRecords)
        const sheetName = country.substring(0, 31)
        XLSX.utils.book_append_sheet(workbook, ws, sheetName)
      })
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `crop-gantt-table-${timestamp}.xlsx`)
    return { success: true, message: 'Excel export completed' }
  } catch (error) {
    console.error('Excel export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export entire table as PNG with dynamic widths
 */
export const exportTableAsPNG = async (elementId, options = {}) => {
  const { scale = 2 } = options

  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Gantt element not found')

    // Capture the entire table with dynamic widths
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      ignoreElements: (el) => {
        // Ignore scrollbars and other UI elements
        return el.className.includes('scrollbar')
      }
    })

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-table-${timestamp}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'PNG export completed - Full table captured' }
  } catch (error) {
    console.error('PNG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export entire table as JPG with dynamic widths
 */
export const exportTableAsJPG = async (elementId, options = {}) => {
  const { scale = 2 } = options

  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Gantt element not found')

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true
    })

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-table-${timestamp}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'JPG export completed - Full table captured' }
  } catch (error) {
    console.error('JPG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export entire table as PDF with multi-page support
 */
export const exportTableAsPDF = async (elementId, options = {}) => {
  const { orientation = 'landscape', scale = 2 } = options

  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Gantt element not found')

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true
    })

    // Calculate PDF dimensions
    const isLandscape = orientation === 'landscape'
    const pageWidth = isLandscape ? 297 : 210 // mm (A4)
    const pageHeight = isLandscape ? 210 : 297 // mm

    const imgWidth = pageWidth - 10 // 5mm margin each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const pdf = new jsPDF({
      orientation: isLandscape ? 'l' : 'p',
      unit: 'mm',
      format: 'a4'
    })

    let heightLeft = imgHeight
    let position = 5 // Start with 5mm margin
    const imgData = canvas.toDataURL('image/png')

    // First page
    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - 10

    // Additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + pageHeight - 10
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 10
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    pdf.save(`crop-gantt-table-${timestamp}.pdf`)

    return { success: true, message: 'PDF export completed - Full table captured' }
  } catch (error) {
    console.error('PDF export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export as JSON with metadata and grouping info
 */
export const exportAsJSON = (records, groupedData, groupingColumns) => {
  try {
    const cleanRecords = records.map(record => {
      const { _index, parsed_data, ...cleanRecord } = record
      return {
        ...cleanRecord,
        month_mask: record.month_mask.toString(2).padStart(12, '0')
      }
    })

    const data = {
      format: 'Crop Calendar Gantt Export',
      exportDate: new Date().toISOString(),
      totalRecords: cleanRecords.length,
      groupingFields: groupingColumns,
      groupedData: groupedData || {},
      records: cleanRecords
    }

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-data-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'JSON export completed' }
  } catch (error) {
    console.error('JSON export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export Gantt table as SVG
 */
export const exportTableAsSVG = async (elementId) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Gantt element not found')

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true
    })

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', canvas.width)
    svg.setAttribute('height', canvas.height)
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`)

    const imgData = canvas.toDataURL('image/png')
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imgData)
    image.setAttribute('width', canvas.width)
    image.setAttribute('height', canvas.height)
    svg.appendChild(image)

    const svgString = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-table-${timestamp}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'SVG export completed' }
  } catch (error) {
    console.error('SVG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export as LZL (portable ZIP package)
 */
export const exportAsLZL = async (records, elementId, options = {}) => {
  try {
    const zip = new JSZip()

    // Metadata
    const metadata = {
      format: 'LZL - Crop Calendar Gantt Export',
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalRecords: records.length,
      groupingColumns: options.groupingColumns || [],
      filterColumn: options.filterColumn || null
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))

    // Data
    const cleanRecords = records.map(record => {
      const { _index, parsed_data, ...cleanRecord } = record
      return {
        ...cleanRecord,
        month_mask: record.month_mask.toString(2).padStart(12, '0')
      }
    })
    zip.file('data.json', JSON.stringify(cleanRecords, null, 2))

    // Grouped data if available
    if (options.groupedData) {
      zip.file('grouped_data.json', JSON.stringify(options.groupedData, null, 2))
    }

    // Gantt preview as PNG
    if (elementId) {
      try {
        const element = document.getElementById(elementId)
        if (element) {
          const canvas = await html2canvas(element, {
            scale: 1.5,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            allowTaint: true
          })
          const imgData = canvas.toDataURL('image/png').split(',')[1]
          zip.file('preview.png', imgData, { base64: true })
        }
      } catch (previewError) {
        console.warn('Could not generate preview:', previewError)
      }
    }

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-export-${timestamp}.lzl`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'LZL export completed - Portable package created' }
  } catch (error) {
    console.error('LZL export error:', error)
    return { success: false, error: error.message }
  }
}
