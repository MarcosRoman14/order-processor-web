import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

export default async function handler(req, res) {
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const client = await clientPromise;
  const db = client.db('order-processor');
  const col = db.collection('clientes');
  const oid = new ObjectId(id);

  // GET — detalle
  if (req.method === 'GET') {
    try {
      const cliente = await col.findOne({ _id: oid });
      if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
      return res.status(200).json(cliente);
    } catch (error) {
      console.error('[clientes GET /:id]', error);
      return res.status(500).json({ error: 'Error al obtener el cliente' });
    }
  }

  // PUT — actualizar
  if (req.method === 'PUT') {
    try {
      const { rfc, razon_social, forma_pago, metodo_pago, uso_cfdi } = req.body ?? {};

      if (!rfc || !razon_social || !forma_pago || !metodo_pago || !uso_cfdi) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      const rfcNorm = String(rfc).toUpperCase().trim();

      if (!RFC_REGEX.test(rfcNorm)) {
        return res.status(400).json({ error: 'RFC inválido' });
      }

      // Verificar duplicado excluyendo el propio documento
      const duplicado = await col.findOne({ rfc: rfcNorm, _id: { $ne: oid } });
      if (duplicado) {
        return res.status(409).json({ error: `Ya existe otro cliente con el RFC ${rfcNorm}` });
      }

      for (const campo of [forma_pago, metodo_pago, uso_cfdi]) {
        if (!campo.codigo || !campo.descripcion) {
          return res.status(400).json({ error: 'Datos de catálogo incompletos' });
        }
      }

      const resultado = await col.findOneAndUpdate(
        { _id: oid },
        {
          $set: {
            rfc: rfcNorm,
            razon_social: String(razon_social).trim(),
            forma_pago: { codigo: forma_pago.codigo, descripcion: forma_pago.descripcion },
            metodo_pago: { codigo: metodo_pago.codigo, descripcion: metodo_pago.descripcion },
            uso_cfdi: { codigo: uso_cfdi.codigo, descripcion: uso_cfdi.descripcion },
            actualizado_en: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!resultado) return res.status(404).json({ error: 'Cliente no encontrado' });
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('[clientes PUT /:id]', error);
      return res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
  }

  // DELETE — eliminar
  if (req.method === 'DELETE') {
    try {
      const resultado = await col.deleteOne({ _id: oid });
      if (resultado.deletedCount === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[clientes DELETE /:id]', error);
      return res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}