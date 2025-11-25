import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

/**
 * Export Gantt table as Excel with column selection
 */
export const exportToExcelWithColumns = async (
  records,
  groupedData,
  groupingColumns,
  selectedColumns = []
) => {
  try {
    const workbook = XLSX.utils.book_new()

    // Use all columns if none selected (default behavior)
    const columnsToExport = selectedColumns.length > 0 ? selectedColumns : [
      ...groupingColumns,
      'period',
      'cropProcess',
      'month_mask',
      'notes'
    ]

    // Build professional table data
    const tableData = []

    // Title
    tableData.push(['CROP CALENDAR GANTT EXPORT - DATA TABLE'])
    tableData.push([])

    // Metadata
    tableData.push(['Export Date:', new Date().toISOString().split('T')[0]])
    tableData.push(['Total Records:', records.length])
    tableData.push(['Columns:', columnsToExport.join(', ')])
    tableData.push([])

    // Column headers
    tableData.push(columnsToExport)

    // Data rows
    records.forEach(record => {
      const row = columnsToExport.map(col => {
        if (col === 'month_mask' && record[col]) {
          return record[col].toString(2).padStart(12, '0')
        }
        return record[col] || ''
      })
      tableData.push(row)
    })

    const ws = XLSX.utils.aoa_to_sheet(tableData)

    // Professional styling
    const range = XLSX.utils.decode_range(ws['!ref'])
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_col(C) + XLSX.utils.encode_row(R)
        const cell = ws[cellAddress]

        if (!cell) continue

        // Title row
        if (R === 0) {
          cell.font = { bold: true, size: 14, color: { rgb: 'FF1F4E78' } }
          cell.fill = { fgColor: { rgb: 'FFD9E1F2' }, patternType: 'solid' }
        }

        // Metadata rows
        if (R >= 2 && R <= 5) {
          cell.font = { size: 11, color: { rgb: 'FF404040' } }
          if (C === 0) {
            cell.font = { bold: true, size: 11, color: { rgb: 'FF404040' } }
          }
        }

        // Column header row
        if (R === 7) {
          cell.fill = { fgColor: { rgb: 'FF4472C4' }, patternType: 'solid' }
          cell.font = { bold: true, color: { rgb: 'FFFFFFFF' }, size: 12 }
          cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }
          cell.border = {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        }

        // Data rows
        if (R > 7) {
          cell.alignment = { vertical: 'center', wrapText: true }
          cell.border = {
            right: { style: 'thin', color: { rgb: 'FFE7E6E6' } },
            bottom: { style: 'thin', color: { rgb: 'FFE7E6E6' } }
          }

          // Alternating row colors
          if (R % 2 === 0) {
            cell.fill = { fgColor: { rgb: 'FFF2F2F2' }, patternType: 'solid' }
          } else {
            cell.fill = { fgColor: { rgb: 'FFFFFFFF' }, patternType: 'solid' }
          }
        }
      }
    }

    // Set column widths
    const colWidths = columnsToExport.map(col => ({ wch: 18 }))
    ws['!cols'] = colWidths

    // Set row heights
    ws['!rows'] = [
      { hpx: 25 }, // Title
      { hpx: 5 },  // Blank
      { hpx: 18 }, // Metadata
      { hpx: 18 },
      { hpx: 18 },
      { hpx: 18 },
      { hpx: 5 },  // Blank
      { hpx: 25 }  // Headers
    ]

    XLSX.utils.book_append_sheet(workbook, ws, 'Gantt Data')

    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `crop-gantt-export-${timestamp}.xlsx`)

    return { success: true, message: 'Excel export completed' }
  } catch (error) {
    console.error('Excel export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper function to capture entire scrollable table
 */
const captureFullTable = async (elementId, scale = 2) => {
  const container = document.getElementById(elementId)
  if (!container) throw new Error('Table element not found')

  // Get the scrollable inner container
  const innerContainer = container.querySelector('.inline-block')
  if (!innerContainer) throw new Error('Inner table element not found')

  // Calculate full width including all months
  const fullWidth = innerContainer.offsetWidth
  const fullHeight = innerContainer.offsetHeight

  // Create a temporary wrapper to prevent css issues
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.top = '0'
  wrapper.style.left = '0'
  wrapper.style.width = fullWidth + 'px'
  wrapper.style.height = fullHeight + 'px'
  wrapper.style.zIndex = '-9999'
  wrapper.style.backgroundColor = '#ffffff'
  wrapper.style.overflow = 'visible'

  // Clone the entire table
  const clone = innerContainer.cloneNode(true)
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    // Capture with proper settings for full table
    const canvas = await html2canvas(wrapper, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: fullWidth,
      height: fullHeight,
      windowHeight: fullHeight,
      windowWidth: fullWidth
    })

    return canvas
  } finally {
    // Clean up
    document.body.removeChild(wrapper)
  }
}

/**
 * Export entire table as PNG with full width
 */
export const exportTableAsPNG = async (elementId, options = {}) => {
  const { scale = 2 } = options

  try {
    const canvas = await captureFullTable(elementId, scale)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-table-${timestamp}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'PNG export completed - Full table captured with all columns' }
  } catch (error) {
    console.error('PNG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export entire table as JPG with full width
 */
export const exportTableAsJPG = async (elementId, options = {}) => {
  const { scale = 2 } = options

  try {
    const canvas = await captureFullTable(elementId, scale)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-gantt-table-${timestamp}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true, message: 'JPG export completed - Full table captured with all columns' }
  } catch (error) {
    console.error('JPG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export entire table as PDF with multi-page support and full width
 */
export const exportTableAsPDF = async (elementId, options = {}) => {
  const { orientation = 'landscape', scale = 2 } = options

  try {
    const canvas = await captureFullTable(elementId, scale)

    // Calculate PDF dimensions
    const isLandscape = orientation === 'landscape'
    const pageWidth = isLandscape ? 297 : 210 // mm (A4)
    const pageHeight = isLandscape ? 210 : 297 // mm
    const margin = 5 // mm

    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const pdf = new jsPDF({
      orientation: isLandscape ? 'l' : 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    })

    let heightLeft = imgHeight
    let position = margin
    const imgData = canvas.toDataURL('image/png', 0.95)
    const availableHeight = pageHeight - margin * 2

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= availableHeight

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + availableHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= availableHeight
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    pdf.save(`crop-gantt-table-${timestamp}.pdf`)

    return { success: true, message: 'PDF export completed - Full table captured with all columns' }
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
    const canvas = await captureFullTable(elementId, 2)

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
        const canvas = await captureFullTable(elementId, 1.5)
        const imgData = canvas.toDataURL('image/png').split(',')[1]
        zip.file('preview.png', imgData, { base64: true })
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
