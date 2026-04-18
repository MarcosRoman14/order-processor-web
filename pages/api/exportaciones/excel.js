import * as XLSX from 'xlsx';
import clientPromise from '../../../lib/mongodb';

function ensureCellInRange(sheet, address) {
  const cell = XLSX.utils.decode_cell(address);
  const currentRange = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : {
    s: { c: 0, r: 0 },
    e: { c: 0, r: 0 },
  };

  currentRange.s.c = Math.min(currentRange.s.c, cell.c);
  currentRange.s.r = Math.min(currentRange.s.r, cell.r);
  currentRange.e.c = Math.max(currentRange.e.c, cell.c);
  currentRange.e.r = Math.max(currentRange.e.r, cell.r);
  sheet['!ref'] = XLSX.utils.encode_range(currentRange);
}

function setCell(sheet, address, value) {
  ensureCellInRange(sheet, address);

  if (value === null || value === undefined || value === '') {
    sheet[address] = { t: 's', v: '' };
    return;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    sheet[address] = { t: 'n', v: value };
    return;
  }

  const numeric = Number(value);
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    sheet[address] = { t: 'n', v: numeric };
    return;
  }

  sheet[address] = { t: 's', v: String(value) };
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

    const workbook = XLSX.read(Buffer.from(template.base64, 'base64'), { type: 'buffer' });
    const sheetName = template.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({ error: 'La hoja configurada no existe en la plantilla.' });
    }

    setCell(sheet, template.rfcCell, cliente.rfc);
    setCell(sheet, template.razonSocialCell, cliente.razon_social);
    setCell(sheet, template.formaPagoCell, cliente.forma_pago);
    setCell(sheet, template.metodoPagoCell, cliente.metodo_pago);
    setCell(sheet, template.usoCfdiCell, cliente.uso_cfdi);

    rows.forEach((row, index) => {
      const rowNumber = Number(template.startRow || 10) + index;
      const qty = Number(row.cantidad || 0);
      const price = Number(row.precio_unitario || 0);
      const importe = qty * price;

      setCell(sheet, `${template.descripcionColumn}${rowNumber}`, row.descripcion || '');
      setCell(sheet, `${template.cantidadColumn}${rowNumber}`, row.cantidad || '');
      setCell(sheet, `${template.precioUnitarioColumn}${rowNumber}`, row.precio_unitario || '');
      setCell(sheet, `${template.importeColumn}${rowNumber}`, importe);
    });

    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeName = String(cliente.razon_social || 'exportacion').replace(/[^a-zA-Z0-9-_]+/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
    return res.status(200).send(output);
  } catch (error) {
    console.error('[exportaciones/excel]', error);
    return res.status(500).json({ error: 'Error al generar el archivo de Excel' });
  }
}
