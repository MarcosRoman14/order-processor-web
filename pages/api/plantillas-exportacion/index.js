import clientPromise from '../../../lib/mongodb';

function normalizeColumn(value, fallback) {
  return String(value || fallback).trim().toUpperCase();
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('order-processor');
  const col = db.collection('plantillas_exportacion');

  if (req.method === 'GET') {
    try {
      const template = await col.findOne({ key: 'active' }, { projection: { base64: 0 } });
      return res.status(200).json({ template });
    } catch (error) {
      console.error('[plantillas-exportacion GET]', error);
      return res.status(500).json({ error: 'Error al obtener la plantilla activa' });
    }
  }

  if (req.method === 'POST') {
    try {
      const current = await col.findOne({ key: 'active' });
      const {
        fileName,
        mimeType,
        base64,
        sheetName,
        rfcCell,
        razonSocialCell,
        formaPagoCell,
        metodoPagoCell,
        usoCfdiCell,
        startRow,
        descripcionColumn,
        cantidadColumn,
        precioUnitarioColumn,
        importeColumn,
      } = req.body ?? {};

      if (!current && (!fileName || !mimeType || !base64)) {
        return res.status(400).json({ error: 'La primera vez debes subir un archivo de plantilla.' });
      }

      const nextTemplate = {
        key: 'active',
        fileName: fileName || current?.fileName,
        mimeType: mimeType || current?.mimeType,
        base64: base64 || current?.base64,
        sheetName: String(sheetName || ''),
        rfcCell: String(rfcCell || 'B2').trim().toUpperCase(),
        razonSocialCell: String(razonSocialCell || 'B3').trim().toUpperCase(),
        formaPagoCell: String(formaPagoCell || 'B4').trim().toUpperCase(),
        metodoPagoCell: String(metodoPagoCell || 'B5').trim().toUpperCase(),
        usoCfdiCell: String(usoCfdiCell || 'B6').trim().toUpperCase(),
        startRow: Number(startRow || 10),
        descripcionColumn: normalizeColumn(descripcionColumn, 'A'),
        cantidadColumn: normalizeColumn(cantidadColumn, 'B'),
        precioUnitarioColumn: normalizeColumn(precioUnitarioColumn, 'C'),
        importeColumn: normalizeColumn(importeColumn, 'D'),
        updatedAt: new Date(),
      };

      await col.updateOne(
        { key: 'active' },
        { $set: nextTemplate },
        { upsert: true }
      );

      const { base64: _, ...safeTemplate } = nextTemplate;
      return res.status(200).json({ template: safeTemplate });
    } catch (error) {
      console.error('[plantillas-exportacion POST]', error);
      return res.status(500).json({ error: 'Error al guardar la plantilla' });
    }
  }

  return res.status(405).json({ error: 'Metodo no permitido' });
}
