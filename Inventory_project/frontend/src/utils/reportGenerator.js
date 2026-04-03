// Report Generation Functions - PDF Version (Stock Availability)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateComprehensiveReport(motorType, components, requirements, maxProduction, criticalComponent, withdrawQty) {
  const doc = new jsPDF();
  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString();

  // ─── Header ───────────────────────────────────────────────────
  doc.setFillColor(44, 62, 80);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Solar Pump BOS Inventory Management System', 105, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Stock Availability Report — ${motorType} Motor`, 105, 22, { align: 'center' });

  // ─── Meta Info ────────────────────────────────────────────────
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(`Generated: ${timestamp}`, 14, 38);
  doc.text(`Motor Type: ${motorType}`, 14, 44);
  doc.text(`Max Production Capacity: ${maxProduction} motors`, 14, 50);
  if (criticalComponent) {
    doc.setTextColor(180, 50, 50);
    doc.text(`Critical Component: ${criticalComponent}`, 14, 56);
  }

  // ─── Summary Boxes ────────────────────────────────────────────
  const totalAvailable = components.reduce((sum, c) => sum + c.quantity, 0);
  const totalUsed = withdrawQty > 0
    ? requirements.reduce((sum, req) => sum + req.required_quantity * withdrawQty, 0)
    : 0;
  const totalRemaining = totalAvailable - totalUsed;
  const shortagesCount = requirements.filter(req => {
    const comp = components.find(c => c.id === req.component_id);
    return comp && comp.quantity < req.required_quantity;
  }).length;

  const boxes = [
    { label: 'Total Stock', value: totalAvailable.toFixed(0), color: [52, 152, 219] },
    { label: 'Used', value: totalUsed.toFixed(0), color: [230, 126, 34] },
    { label: 'Remaining', value: totalRemaining.toFixed(0), color: [39, 174, 96] },
    { label: 'Low/Out of Stock', value: shortagesCount, color: [231, 76, 60] },
  ];

  const startY = criticalComponent ? 64 : 58;
  boxes.forEach((box, i) => {
    const x = 14 + i * 47;
    doc.setFillColor(...box.color);
    doc.roundedRect(x, startY, 43, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(box.value), x + 21.5, startY + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(box.label, x + 21.5, startY + 16, { align: 'center' });
  });

  // ─── Stock Availability Table ──────────────────────────────────
  const tableStartY = startY + 26;

  doc.setTextColor(44, 62, 80);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Stock Availability', 14, tableStartY);

  const tableRows = requirements.map(req => {
    const comp = components.find(c => c.id === req.component_id);
    if (!comp) return null;

    const canProduce = Math.floor(comp.quantity / req.required_quantity);
    const used = parseFloat((req.required_quantity * withdrawQty).toFixed(2));
    const remaining = parseFloat((comp.quantity - used).toFixed(2));

    let status = 'OK';
    let statusColor = [39, 174, 96];
    if (comp.quantity === 0) {
      status = 'OUT OF STOCK';
      statusColor = [231, 76, 60];
    } else if (comp.quantity < req.required_quantity) {
      status = 'CRITICALLY LOW';
      statusColor = [231, 76, 60];
    } else if (comp.quantity < req.required_quantity * 5) {
      status = 'LOW';
      statusColor = [230, 126, 34];
    }

    return {
      row: [
        comp.name,
        comp.unit,
        req.required_quantity,
        comp.quantity,
        used > 0 ? used : '-',
        remaining !== comp.quantity ? remaining : '-',
        canProduce,
        status
      ],
      statusColor
    };
  }).filter(Boolean);

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Component Name', 'Unit', 'Req/Motor', 'Available', 'Used', 'Remaining', 'Can Produce', 'Status']],
    body: tableRows.map(r => r.row),
    headStyles: {
      fillColor: [44, 62, 80],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 12 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const rowData = tableRows[data.row.index];
        if (rowData) {
          const [r, g, b] = rowData.statusColor;
          doc.setFillColor(r, g, b);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 2, 2, 'F');
          doc.setFontSize(7);
          doc.text(
            String(data.cell.raw),
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2 + 1,
            { align: 'center' }
          );
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ─── Footer ───────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(44, 62, 80);
  doc.rect(0, pageHeight - 10, 210, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`Solar Pump Inventory System — ${date}`, 105, pageHeight - 4, { align: 'center' });

  return doc;
}

export function downloadReport(motorType, components, requirements, maxProduction, criticalComponent, withdrawQty) {
  const doc = generateComprehensiveReport(
    motorType,
    components,
    requirements,
    maxProduction,
    criticalComponent,
    withdrawQty
  );

  const date = new Date().toISOString().split('T')[0];
  const qty = withdrawQty > 0 ? `_${withdrawQty}motors` : '';
  const filename = `${motorType}_Stock_Report_${date}${qty}.pdf`;

  doc.save(filename);
}