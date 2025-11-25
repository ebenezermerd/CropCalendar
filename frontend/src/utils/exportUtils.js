import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

/**
 * Export to Excel with multiple options
 */
export const exportToExcel = async (records, options = {}) => {
  const { format = 'all', groupBy = null } = options
  
  try {
    const workbook = XLSX.utils.book_new()
    
    // Option 1: All rows in one sheet
    if (format === 'all' || format === 'raw') {
      const wsData = records.map(record => {
        const { _index, month_mask, parsed_data, ...cleanRecord } = record
        return cleanRecord
      })
      const ws = XLSX.utils.json_to_sheet(wsData)
      XLSX.utils.book_append_sheet(workbook, ws, 'All Data')
    }
    
    // Option 2: Normalized data only
    if (format === 'normalized') {
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
    }
    
    // Option 3: One sheet per country
    if (format === 'byCountry' || format === 'all') {
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
        const sheetName = country.substring(0, 31) // Excel sheet name limit
        XLSX.utils.book_append_sheet(workbook, ws, sheetName)
      })
    }
    
    // Save the workbook
    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `crop-export-${timestamp}.xlsx`)
    return { success: true, message: 'Excel export completed' }
  } catch (error) {
    console.error('Excel export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export Gantt chart as PNG
 */
export const exportGanttAsPNG = async (elementId) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Element not found')
    
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    })
    
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `gantt-chart-${timestamp}.png`
    link.click()
    
    return { success: true, message: 'PNG export completed' }
  } catch (error) {
    console.error('PNG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export Gantt chart as JPG
 */
export const exportGanttAsJPG = async (elementId, quality = 0.95) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Element not found')
    
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    })
    
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/jpeg', quality)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `gantt-chart-${timestamp}.jpg`
    link.click()
    
    return { success: true, message: 'JPG export completed' }
  } catch (error) {
    console.error('JPG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export Gantt chart as PDF
 */
export const exportGanttAsPDF = async (elementId, orientation = 'landscape') => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Element not found')
    
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    })
    
    // Calculate dimensions for PDF
    const imgWidth = orientation === 'landscape' ? 297 : 210 // mm (A4)
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: 'a4'
    })
    
    let heightLeft = imgHeight
    let position = 0
    const imgData = canvas.toDataURL('image/png')
    const pageHeight = orientation === 'landscape' ? 210 : 297 // mm
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    
    const timestamp = new Date().toISOString().slice(0, 10)
    pdf.save(`gantt-chart-${timestamp}.pdf`)
    
    return { success: true, message: 'PDF export completed' }
  } catch (error) {
    console.error('PDF export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export as JSON
 */
export const exportAsJSON = (records, options = {}) => {
  try {
    const cleanRecords = records.map(record => {
      const { _index, parsed_data, ...cleanRecord } = record
      return {
        ...cleanRecord,
        month_mask: record.month_mask.toString(2).padStart(12, '0')
      }
    })
    
    const data = {
      exportDate: new Date().toISOString(),
      totalRecords: cleanRecords.length,
      records: cleanRecords
    }
    
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-data-${timestamp}.json`
    link.click()
    
    return { success: true, message: 'JSON export completed' }
  } catch (error) {
    console.error('JSON export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export as SVG (Gantt chart)
 */
export const exportGanttAsSVG = (elementId) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Element not found')
    
    // Clone the element
    const clone = element.cloneNode(true)
    
    // Create SVG wrapper
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', element.offsetWidth)
    svg.setAttribute('height', element.offsetHeight)
    svg.setAttribute('viewBox', `0 0 ${element.offsetWidth} ${element.offsetHeight}`)
    
    // Serialize HTML to image-based SVG
    html2canvas(element, {
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png')
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imgData)
      image.setAttribute('width', element.offsetWidth)
      image.setAttribute('height', element.offsetHeight)
      svg.appendChild(image)
      
      // Download
      const svgString = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const timestamp = new Date().toISOString().slice(0, 10)
      link.download = `gantt-chart-${timestamp}.svg`
      link.click()
    })
    
    return { success: true, message: 'SVG export in progress' }
  } catch (error) {
    console.error('SVG export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export as LZL (custom ZIP format with metadata, data, preview)
 */
export const exportAsLZL = async (records, elementId, options = {}) => {
  try {
    const zip = new JSZip()
    
    // 1. Metadata
    const metadata = {
      format: 'LZL',
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalRecords: records.length,
      groupingColumns: options.groupingColumns || [],
      filterColumn: options.filterColumn || null
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))
    
    // 2. Data
    const cleanRecords = records.map(record => {
      const { _index, parsed_data, ...cleanRecord } = record
      return {
        ...cleanRecord,
        month_mask: record.month_mask.toString(2).padStart(12, '0')
      }
    })
    zip.file('data.json', JSON.stringify(cleanRecords, null, 2))
    
    // 3. Gantt preview as PNG
    if (elementId) {
      try {
        const element = document.getElementById(elementId)
        if (element) {
          const canvas = await html2canvas(element, {
            scale: 1.5,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
          })
          const imgData = canvas.toDataURL('image/png').split(',')[1]
          zip.file('preview.png', imgData, { base64: true })
        }
      } catch (previewError) {
        console.warn('Could not generate preview:', previewError)
      }
    }
    
    // Generate and download ZIP
    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `crop-export-${timestamp}.lzl`
    link.click()
    
    return { success: true, message: 'LZL export completed' }
  } catch (error) {
    console.error('LZL export error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Batch export multiple groups
 */
export const batchExport = async (groupedRecords, exportFormat, elementId) => {
  try {
    const results = []
    
    for (const [groupName, records] of Object.entries(groupedRecords)) {
      const safeName = groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      
      switch (exportFormat) {
        case 'excel':
          await exportToExcel(records, { format: 'all' })
          results.push({ group: groupName, status: 'completed' })
          break
        case 'json':
          exportAsJSON(records)
          results.push({ group: groupName, status: 'completed' })
          break
        case 'lzl':
          await exportAsLZL(records, null, { groupName: safeName })
          results.push({ group: groupName, status: 'completed' })
          break
      }
    }
    
    return { success: true, results }
  } catch (error) {
    console.error('Batch export error:', error)
    return { success: false, error: error.message }
  }
}
