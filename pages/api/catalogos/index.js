import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('order-processor');
    const { tipo } = req.query;

    const query = { activo: true };
    if (tipo) query.tipo = tipo;

    const items = await db
      .collection('catalogos')
      .find(query, { projection: { _id: 0, codigo: 1, descripcion: 1, tipo: 1 } })
      .sort({ tipo: 1, codigo: 1 })
      .toArray();

    if (tipo) {
      // Devolver lista plana cuando se filtra por tipo
      return res.status(200).json(items.map(({ codigo, descripcion }) => ({ codigo, descripcion })));
    }

    // Devolver objeto agrupado por tipo
    const agrupado = items.reduce((acc, item) => {
      if (!acc[item.tipo]) acc[item.tipo] = [];
      acc[item.tipo].push({ codigo: item.codigo, descripcion: item.descripcion });
      return acc;
    }, {});

    return res.status(200).json(agrupado);
  } catch (error) {
    console.error('[catalogos] Error:', error);
    return res.status(500).json({ error: 'Error al obtener catálogos' });
  }
}
