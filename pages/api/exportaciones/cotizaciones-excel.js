import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { cliente, rows } = req.body ?? {};

    if (!cliente?.clienteId || !cliente?.nombreCliente) {
      return res.status(400).json({ error: 'Selecciona un cliente para exportar.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No hay productos para exportar.' });
    }

    const header = [
      ['Cotizacion'],
      ['Cliente', cliente.nombreCliente],
      ['Fecha', new Date().toISOString()],
      [],
      ['Relacionar precio con cliente', 'Producto', 'Precio'],
    ];

    const dataRows = rows.map((row) => [
      row.relacionar_precio ? 'SI' : 'NO',
      row.nombre || '',
      Number(row.precio || 0),
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([...header, ...dataRows]);

    sheet['!cols'] = [
      { wch: 28 },
      { wch: 45 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Cotizacion');

    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeName = String(cliente.nombreCliente || 'cotizacion').replace(/[^a-zA-Z0-9-_]+/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="cotizacion_${safeName}.xlsx"`);
    return res.status(200).send(output);
  } catch (error) {
    console.error('[exportaciones/cotizaciones-excel]', error);
    return res.status(500).json({ error: 'Error al generar el archivo de Excel' });
  }
}
