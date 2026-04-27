import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const { clienteId } = req.query;

  if (!clienteId) {
    return res.status(400).json({ error: 'clienteId es requerido' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('order-processor');

    const precios = await db
      .collection('precios_cliente')
      .find({ clienteId: String(clienteId) })
      .toArray();

    return res.status(200).json(precios);
  } catch (error) {
    console.error('[cotizaciones/precios-cliente]', error);
    return res.status(500).json({ error: 'Error al obtener precios del cliente' });
  }
}
