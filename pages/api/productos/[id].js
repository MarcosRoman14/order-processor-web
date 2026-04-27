import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

function normalizarPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  if (numero < 0) return null;
  return Number(numero.toFixed(2));
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID invalido' });
  }

  const client = await clientPromise;
  const db = client.db('order-processor');
  const col = db.collection('productos');
  const oid = new ObjectId(id);

  if (req.method === 'GET') {
    try {
      const producto = await col.findOne({ _id: oid });
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.status(200).json(producto);
    } catch (error) {
      console.error('[productos GET /:id]', error);
      return res.status(500).json({ error: 'Error al obtener el producto' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nombre, precio_default } = req.body ?? {};

      const nombreNorm = String(nombre || '').trim();
      const precioNorm = normalizarPrecio(precio_default);

      if (!nombreNorm || precioNorm === null) {
        return res.status(400).json({
          error: 'Nombre y precio default son obligatorios y validos',
        });
      }

      const duplicado = await col.findOne({
        _id: { $ne: oid },
        nombre: { $regex: `^${nombreNorm}$`, $options: 'i' },
      });

      if (duplicado) {
        return res.status(409).json({ error: `Ya existe otro producto con el nombre ${nombreNorm}` });
      }

      const resultado = await col.findOneAndUpdate(
        { _id: oid },
        {
          $set: {
            nombre: nombreNorm,
            precio_default: precioNorm,
            actualizado_en: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!resultado) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('[productos PUT /:id]', error);
      return res.status(500).json({ error: 'Error al actualizar el producto' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const resultado = await col.deleteOne({ _id: oid });
      if (resultado.deletedCount === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[productos DELETE /:id]', error);
      return res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  }

  return res.status(405).json({ error: 'Metodo no permitido' });
}
