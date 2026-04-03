// Report Generation Functions - Excel (.xlsx) Version
import * as XLSX from 'xlsx';

export function generateComprehensiveReport(motorType, components, requirements, maxProduction, criticalComponent, withdrawQty) {
  const timestamp = new Date().toLocaleString();
  const date = new Date().toISOString().split('T')[0];

  // Calculate all metrics
  const totalAvailable = components.reduce((sum, c) => sum + c.quantity, 0);
  const totalUsed = withdrawQty > 0 ? requirements.reduce((sum, req) => sum + (req.required_quantity * withdrawQty), 0) : 0;
  const totalRemaining = totalAvailable - totalUsed;
  const efficiency = totalAvailable > 0 ? ((totalUsed / totalAvailable) * 100).toFixed(2) : 0;

  // Identify shortages and low stock
  const shortages = [];
  const lowStock = [];

  requirements.forEach(req => {
    const comp = components.find(c => c.id === req.component_id);
    if (comp) {
      const needed = req.required_quantity * withdrawQty;
      if (comp.quantity < needed && withdrawQty > 0) {
        shortages.push({
          name: comp.name,
          available: comp.quantity,
          needed: needed,
          shortage: needed - comp.quantity
        });
      }
      if (comp.quantity < req.required_quantity) {
        lowStock.push({
          name: comp.name,
          available: comp.quantity,
          required: req.required_quantity
        });
      }
    }
  });

  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Summary ───────────────────────────────────────────
  const summaryData = [
    ['SOLAR PUMP BOS INVENTORY MANAGEMENT SYSTEM'],
    ['Production Analysis & Feasibility Report'],
    [],
    ['Motor Type', motorType],
    ['Report Generated', timestamp],
    ['Production Quantity', withdrawQty + ' motors'],
    [],
    ['SUMMARY'],
    ['Total Components', components.length],
    ['Total Available Stock', parseFloat(totalAvailable.toFixed(2))],
    ['Total Stock to be Used', parseFloat(totalUsed.toFixed(2))],
    ['Remaining Stock', parseFloat(totalRemaining.toFixed(2))],
    ['Maximum Production Capacity', maxProduction + ' motors'],
    ['Production Efficiency', efficiency + '%'],
    ['Production Status', shortages.length === 0 ? 'FEASIBLE' : 'NOT FEASIBLE'],
    ['Shortage Components', shortages.length],
    ['Low Stock Components', lowStock.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ─── Sheet 2: Component Analysis ────────────────────────────────
  const compHeaders = [
    'Component Name',
    'Unit',
    'Required per Motor',
    'Available Stock',
    'Used',
    'Remaining',
    'Can Produce (motors)',
    'Critical?',
    'Status'
  ];

  const compRows = requirements.map(req => {
    const comp = components.find(c => c.id === req.component_id);
    if (!comp) return [];
    const used = parseFloat((req.required_quantity * withdrawQty).toFixed(2));
    const remaining = parseFloat((comp.quantity - used).toFixed(2));
    const canProduce = Math.floor(comp.quantity / req.required_quantity);
    const isCritical = comp.name === criticalComponent ? 'YES ★' : 'No';
    const status = comp.quantity === 0 ? 'OUT OF STOCK'
      : comp.quantity < req.required_quantity ? 'CRITICALLY LOW'
      : comp.quantity < req.required_quantity * 5 ? 'LOW'
      : 'OK';

    return [
      comp.name,
      comp.unit,
      req.required_quantity,
      comp.quantity,
      used,
      remaining,
      canProduce,
      isCritical,
      status
    ];
  });

  const wsComponents = XLSX.utils.aoa_to_sheet([compHeaders, ...compRows]);
  wsComponents['!cols'] = [
    { wch: 32 }, { wch: 8 }, { wch: 18 }, { wch: 16 },
    { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsComponents, 'Component Analysis');

  // ─── Sheet 3: Shortages ─────────────────────────────────────────
  const shortageHeaders = ['Component Name', 'Available', 'Required', 'Shortage'];
  const shortageRows = shortages.length > 0
    ? shortages.map(s => [s.name, s.available, parseFloat(s.needed.toFixed(2)), parseFloat(s.shortage.toFixed(2))])
    : [['No shortages detected', '', '', '']];
  const wsShortages = XLSX.utils.aoa_to_sheet([shortageHeaders, ...shortageRows]);
  wsShortages['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsShortages, 'Shortages');

  // ─── Sheet 4: Low Stock ─────────────────────────────────────────
  const lowStockHeaders = ['Component Name', 'Available', 'Required per Motor', 'Status'];
  const lowStockRows = lowStock.length > 0
    ? lowStock.map(s => [
        s.name,
        s.available,
        s.required,
        s.available === 0 ? 'OUT OF STOCK' : 'CRITICALLY LOW'
      ])
    : [['All components above minimum threshold', '', '', '']];
  const wsLowStock = XLSX.utils.aoa_to_sheet([lowStockHeaders, ...lowStockRows]);
  wsLowStock['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsLowStock, 'Low Stock');

  // ─── Sheet 5: Production Analysis ───────────────────────────────
  const efficiencyRating =
    parseFloat(efficiency) < 30 ? 'LOW (< 30%) - Good stock levels' :
    parseFloat(efficiency) < 60 ? 'MODERATE (30-60%) - Balanced' :
    parseFloat(efficiency) < 80 ? 'HIGH (60-80%) - Monitor stock' :
    'CRITICAL (> 80%) - Restock immediately';

  const feasibility =
    withdrawQty === 0 ? 'No quantity specified' :
    withdrawQty > maxProduction ? `NOT FEASIBLE - Exceeds capacity (${maxProduction})` :
    shortages.length > 0 ? `NOT FEASIBLE - ${shortages.length} shortage(s)` :
    'FEASIBLE ✓';

  const prodData = [
    ['PRODUCTION ANALYSIS'],
    [],
    ['Maximum Production Capacity', maxProduction + ' motors'],
    ['Critical Component', criticalComponent || 'None'],
    [],
    ['Resource Utilization', efficiency + '%'],
    ['Stock Used', parseFloat(totalUsed.toFixed(2))],
    ['Total Stock', parseFloat(totalAvailable.toFixed(2))],
    ['Remaining Stock', parseFloat(totalRemaining.toFixed(2))],
    [],
    ['Efficiency Rating', efficiencyRating],
    ['Feasibility', feasibility],
  ];
  const wsProd = XLSX.utils.aoa_to_sheet(prodData);
  wsProd['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsProd, 'Production Analysis');

  return wb;
}

export function downloadReport(motorType, components, requirements, maxProduction, criticalComponent, withdrawQty) {
  const wb = generateComprehensiveReport(
    motorType,
    components,
    requirements,
    maxProduction,
    criticalComponent,
    withdrawQty
  );

  const date = new Date().toISOString().split('T')[0];
  const qty = withdrawQty > 0 ? `_${withdrawQty}motors` : '';
  const filename = `${motorType}_Production_Report_${date}${qty}.xlsx`;

  XLSX.writeFile(wb, filename);
}