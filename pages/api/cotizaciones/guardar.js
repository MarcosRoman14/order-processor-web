import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const { clienteId, items } = req.body ?? {};

    if (!clienteId) {
      return res.status(400).json({ error: 'clienteId es requerido' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No hay items para guardar' });
    }

    const client = await clientPromise;
    const db = client.db('order-processor');

    // 1. Guardar productos nuevos (custom, no existen en catálogo)
    const nuevos = items.filter((item) => String(item.productoId || '').startsWith('custom-'));

    for (const item of nuevos) {
      const nombre = String(item.nombre || '').trim();
      if (!nombre) continue;

      const existe = await db.collection('productos').findOne({
        nombre: { $regex: `^${nombre}$`, $options: 'i' },
      });

      if (!existe) {
        await db.collection('productos').insertOne({
          nombre,
          precio_default: Number(item.precio || 0),
          creado_en: new Date(),
        });
      }
    }

    // 2. Guardar relación cliente-producto-precio para items con relacionar_precio activo
    const aRelacionar = items.filter((item) => item.relacionar_precio);

    for (const item of aRelacionar) {
      const nombreLower = String(item.nombre || '').toLowerCase().trim();
      if (!nombreLower) continue;

      await db.collection('precios_cliente').updateOne(
        { clienteId: String(clienteId), nombre_lower: nombreLower },
        {
          $set: {
            clienteId: String(clienteId),
            nombre_lower: nombreLower,
            nombre: String(item.nombre || '').trim(),
            precio: Number(item.precio || 0),
            actualizado_en: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[cotizaciones/guardar]', error);
    return res.status(500).json({ error: 'Error al guardar cotizacion' });
  }
}
