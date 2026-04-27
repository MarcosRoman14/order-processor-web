import clientPromise from '../../../lib/mongodb';

function normalizarPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  if (numero < 0) return null;
  return Number(numero.toFixed(2));
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('order-processor');
  const col = db.collection('productos');

  if (req.method === 'GET') {
    try {
      const productos = await col.find({}).sort({ creado_en: -1 }).toArray();
      return res.status(200).json(productos);
    } catch (error) {
      console.error('[productos GET]', error);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nombre, precio_default } = req.body ?? {};

      const nombreNorm = String(nombre || '').trim();
      const precioNorm = normalizarPrecio(precio_default);

      if (!nombreNorm || precioNorm === null) {
        return res.status(400).json({
          error: 'Nombre y precio default son obligatorios y válidos',
        });
      }

      const existe = await col.findOne({ nombre: { $regex: `^${nombreNorm}$`, $options: 'i' } });
      if (existe) {
        return res.status(409).json({ error: `Ya existe un producto con el nombre ${nombreNorm}` });
      }

      const nuevoProducto = {
        nombre: nombreNorm,
        precio_default: precioNorm,
        creado_en: new Date(),
      };

      const result = await col.insertOne(nuevoProducto);
      return res.status(201).json({ _id: result.insertedId, ...nuevoProducto });
    } catch (error) {
      console.error('[productos POST]', error);
      return res.status(500).json({ error: 'Error al guardar el producto' });
    }
  }

  return res.status(405).json({ error: 'Metodo no permitido' });
}
