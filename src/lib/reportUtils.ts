import type { VoyageCalculation, Voyage, Vessel } from '../types'
import type { FuelGrade } from '../types'
import { formatMT, formatHours } from './calculations'

// ─── Text-based report generation (HTML → PDF via html2canvas + jsPDF) ─────

export function buildReportHTML(
  calc: VoyageCalculation,
  voyage: Voyage,
  vessel: Vessel,
  fuelGrades: FuelGrade[]
): string {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const gradeMap = Object.fromEntries(fuelGrades.map(g => [g.id, g.label]))

  const activeGradeIds = Array.from(
    new Set(calc.legResults.flatMap(r => Object.keys(r.consumption.total)))
  ).filter(id => gradeMap[id])

  const legs = voyage.legs.slice().sort((a, b) => a.order - b.order)

  const gradeHeaders = activeGradeIds.map(id => `<th>${gradeMap[id] ?? id}</th>`).join('')
  const gradeRobHeaders = activeGradeIds.map(id => `<th>ROB ${gradeMap[id] ?? id}</th>`).join('')

  const legRows = legs.map((leg, i) => {
    const r = calc.legResults.find(x => x.legId === leg.id)
    if (!r) return ''
    const gradeCols = activeGradeIds.map(id => {
      const qty = r.consumption.total[id] ?? 0
      return `<td class="num">${qty > 0 ? formatMT(qty) + ' MT' : '—'}</td>`
    }).join('')
    const robCols = activeGradeIds.map(id => {
      const rob = r.robByGradeAtEnd[id] ?? 0
      return `<td class="num">${formatMT(rob)} MT</td>`
    }).join('')
    const totalHrs = r.consumption.seaHoursTotal + r.consumption.portHours
    const modeTag = (() => {
      const l = voyage.legs.find(x => x.id === leg.id)
      if (l?.blendMode?.enabled) return ' [Blend]'
      if (l?.ecaZone?.enabled) return ' [ECA]'
      return ''
    })()
    return `<tr><td>${i + 1}</td><td>${leg.name}${modeTag}</td><td class="num">${formatHours(totalHrs)}</td>${gradeCols}${robCols}</tr>`
  }).join('')

  const totalGradeCols = activeGradeIds.map(id => {
    const t = calc.totalConsumptionByGrade[id] ?? 0
    return `<td class="num bold">${formatMT(t)} MT</td>`
  }).join('')
  const finalRobCols = activeGradeIds.map(id => {
    const r = calc.finalRobByGrade[id] ?? 0
    return `<td class="num bold">${formatMT(r)} MT</td>`
  }).join('')

  const tankRows = [...vessel.tanks]
    .sort((a, b) => a.consumptionOrder - b.consumptionOrder)
    .map(tank => {
      const grade = fuelGrades.find(g => g.id === tank.fuelGradeId)
      const initialRob = calc.initialTankSnapshots.find(s => s.tankId === tank.id)?.robMT ?? 0
      const finalRob = calc.finalTankSnapshots.find(s => s.tankId === tank.id)?.robMT ?? 0
      const used = initialRob - finalRob
      return `<tr>
        <td>${tank.consumptionOrder}</td>
        <td>${tank.name}</td>
        <td>${grade?.label ?? tank.fuelGradeId}</td>
        <td class="num">${formatMT(tank.capacityMT)} MT</td>
        <td class="num">${formatMT(initialRob)} MT</td>
        <td class="num">${formatMT(used)} MT</td>
        <td class="num">${formatMT(finalRob)} MT</td>
      </tr>`
    }).join('')

  const bunkerRows = voyage.bunkerEvents.map(b => {
    const afterLeg = legs.find(l => l.id === b.afterLegId)?.name ?? b.afterLegId
    const quantities = Object.entries(b.quantities)
      .filter(([, v]) => v > 0)
      .map(([g, v]) => `${gradeMap[g] ?? g}: ${v} MT`)
      .join(', ')
    return `<tr><td>After: ${afterLeg}</td><td>${b.port || '—'}</td><td>${quantities}</td><td>${b.notes || ''}</td></tr>`
  }).join('')

  const warnSection = calc.allWarnings.length > 0
    ? `<div class="section warn"><h3>⚠ Warnings</h3><ul>${calc.allWarnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a2235; margin: 0; padding: 20px; background: white; }
  h1 { font-size: 18px; color: #0f172a; margin-bottom: 2px; }
  .subtitle { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  .section { margin-bottom: 20px; }
  h2 { font-size: 13px; color: #1e3a5f; border-bottom: 1.5px solid #3b82f6; padding-bottom: 4px; margin-bottom: 8px; }
  h3 { font-size: 12px; color: #92400e; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #e2e8f0; text-align: left; padding: 5px 8px; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; }
  td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-family: monospace; }
  .bold { font-weight: bold; }
  .totals td { background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #94a3b8; }
  .summary-cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; min-width: 120px; }
  .card-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; }
  .card-val { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 2px; }
  .card-sub { font-size: 10px; color: #94a3b8; }
  .warn { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 8px 12px; }
  .warn li { color: #92400e; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px; }
</style>
</head>
<body>
<h1>Voyage Fuel Calculation Report</h1>
<div class="subtitle">${vessel.name}${vessel.imoNumber ? ` — IMO ${vessel.imoNumber}` : ''} &nbsp;|&nbsp; ${voyage.name} &nbsp;|&nbsp; Generated ${dateStr}</div>

<div class="summary-cards">
${activeGradeIds.map(id => {
  const init = calc.initialRobByGrade[id] ?? 0
  const used = calc.totalConsumptionByGrade[id] ?? 0
  const fin = calc.finalRobByGrade[id] ?? 0
  return `<div class="card"><div class="card-label">${gradeMap[id] ?? id}</div><div class="card-val">${formatMT(fin)} MT</div><div class="card-sub">Start ${formatMT(init)} / Used ${formatMT(used)}</div></div>`
}).join('')}
</div>

${warnSection}

<div class="section">
<h2>Leg-by-Leg Consumption</h2>
<table>
  <thead><tr><th>#</th><th>Leg</th><th>Duration</th>${gradeHeaders}${gradeRobHeaders}</tr></thead>
  <tbody>
    ${legRows}
    <tr class="totals"><td colspan="3"><strong>TOTAL</strong></td>${totalGradeCols}${finalRobCols}</tr>
  </tbody>
</table>
</div>

<div class="section">
<h2>Tank ROB Summary</h2>
<table>
  <thead><tr><th>Order</th><th>Tank</th><th>Grade</th><th>Capacity</th><th>Initial ROB</th><th>Consumed</th><th>Final ROB</th></tr></thead>
  <tbody>${tankRows}</tbody>
</table>
</div>

${voyage.bunkerEvents.length > 0 ? `
<div class="section">
<h2>Bunker Events</h2>
<table>
  <thead><tr><th>After Leg</th><th>Port</th><th>Quantities</th><th>Notes</th></tr></thead>
  <tbody>${bunkerRows}</tbody>
</table>
</div>` : ''}

<div class="footer">
  VoyageFuel Planner · ${dateStr} · All quantities in metric tonnes (MT) · Distances in nautical miles (nm)
</div>
</body>
</html>`
}

export async function exportToPDF(
  calc: VoyageCalculation,
  voyage: Voyage,
  vessel: Vessel,
  fuelGrades: FuelGrade[]
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')

  const html = buildReportHTML(calc, voyage, vessel, fuelGrades)

  // Create hidden iframe for rendering
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'
  iframe.style.width = '900px'
  iframe.style.height = '1200px'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) { document.body.removeChild(iframe); return }

  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  await new Promise(res => setTimeout(res, 300)) // let it render

  try {
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 900,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height * pageW) / canvas.width
    let y = 0

    while (y < imgH) {
      if (y > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH)
      y += pageH
    }

    const filename = `voyage-report-${vessel.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  } finally {
    document.body.removeChild(iframe)
  }
}
