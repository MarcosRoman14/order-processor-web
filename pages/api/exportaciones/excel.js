import ExcelJS from 'exceljs';
import clientPromise from '../../../lib/mongodb';

function normalizeCellValue(value) {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const numeric = Number(value);
  if (
    typeof value === 'string'
    && value.trim() !== ''
    && !Number.isNaN(numeric)
    && /^-?\d+(\.\d+)?$/.test(value.trim())
  ) {
    return numeric;
  }

  return String(value);
}

function setCell(worksheet, address, value) {
  const cell = worksheet.getCell(address);
  const currentValue = cell.value;

  // No sobrescribir celdas con formulas compartidas de la plantilla.
  if (
    currentValue
    && typeof currentValue === 'object'
    && (currentValue.formula || currentValue.sharedFormula)
  ) {
    return;
  }

  cell.value = normalizeCellValue(value);
}

function cloneStyle(style) {
  return style ? JSON.parse(JSON.stringify(style)) : undefined;
}

function copyTemplateRowStyle(worksheet, fromRowNumber, toRowNumber, columns) {
  if (fromRowNumber === toRowNumber) return;

  columns.forEach((columnLetter) => {
    const fromCell = worksheet.getCell(`${columnLetter}${fromRowNumber}`);
    const toCell = worksheet.getCell(`${columnLetter}${toRowNumber}`);
    const styleClone = cloneStyle(fromCell.style);
    if (styleClone && Object.keys(styleClone).length > 0) {
      toCell.style = styleClone;
    }
    if (fromCell.numFmt && !toCell.numFmt) {
      toCell.numFmt = fromCell.numFmt;
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { cliente, rows } = req.body ?? {};

    if (!cliente?.rfc || !cliente?.razon_social) {
      return res.status(400).json({ error: 'Faltan datos del cliente para exportar.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No hay productos para exportar.' });
    }

    const mongo = await clientPromise;
    const db = mongo.db('order-processor');
    const template = await db.collection('plantillas_exportacion').findOne({ key: 'active' });

    if (!template?.base64) {
      return res.status(400).json({ error: 'No hay una plantilla activa configurada.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(template.base64, 'base64'));

    const sheetName = template.sheetName || workbook.worksheets[0]?.name;
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      return res.status(400).json({ error: 'La hoja configurada no existe en la plantilla.' });
    }

    setCell(worksheet, template.rfcCell, cliente.rfc);
    setCell(worksheet, template.razonSocialCell, cliente.razon_social);
    setCell(worksheet, template.formaPagoCell, cliente.forma_pago);
    setCell(worksheet, template.metodoPagoCell, cliente.metodo_pago);
    setCell(worksheet, template.usoCfdiCell, cliente.uso_cfdi);

    const startRow = Number(template.startRow || 10);
    const itemColumns = [
      template.descripcionColumn,
      template.cantidadColumn,
      template.precioUnitarioColumn,
      template.importeColumn,
    ];

    rows.forEach((row, index) => {
      const rowNumber = startRow + index;
      const qty = Number(row.cantidad || 0);
      const price = Number(row.precio_unitario || 0);
      const importe = qty * price;

      copyTemplateRowStyle(worksheet, startRow, rowNumber, itemColumns);

      setCell(worksheet, `${template.descripcionColumn}${rowNumber}`, row.descripcion || '');
      setCell(worksheet, `${template.cantidadColumn}${rowNumber}`, row.cantidad || '');
      setCell(worksheet, `${template.precioUnitarioColumn}${rowNumber}`, row.precio_unitario || '');
      setCell(worksheet, `${template.importeColumn}${rowNumber}`, importe);
    });

    const output = await workbook.xlsx.writeBuffer();
    const safeName = String(cliente.razon_social || 'exportacion').replace(/[^a-zA-Z0-9-_]+/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
    return res.status(200).send(output);
  } catch (error) {
    console.error('[exportaciones/excel]', error);
    return res.status(500).json({ error: 'Error al generar el archivo de Excel' });
  }
}
