import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('order-processor');
    const cliente = await db.collection('clientes').findOne({ _id: new ObjectId(id) });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.status(200).json(cliente);
  } catch (error) {
    console.error('[clientes/:id]', error);
    return res.status(500).json({ error: 'Error al obtener el cliente' });
  }
}
