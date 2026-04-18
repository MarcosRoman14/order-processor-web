import clientPromise from '../../../lib/mongodb';

// RFC válido: 3-4 letras (incluye Ñ y &) + 6 dígitos (fecha) + 3 alfanuméricos
const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('order-processor');
  const col = db.collection('clientes');

  if (req.method === 'GET') {
    try {
      const clientes = await col.find({}).sort({ creado_en: -1 }).toArray();
      return res.status(200).json(clientes);
    } catch (error) {
      console.error('[clientes GET]', error);
      return res.status(500).json({ error: 'Error al obtener clientes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { rfc, razon_social, forma_pago, metodo_pago, uso_cfdi } = req.body ?? {};

      // Validación de campos obligatorios
      if (!rfc || !razon_social || !forma_pago || !metodo_pago || !uso_cfdi) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      const rfcNorm = String(rfc).toUpperCase().trim();

      if (!RFC_REGEX.test(rfcNorm)) {
        return res.status(400).json({
          error: 'RFC inválido. Formato esperado: 3-4 letras + 6 dígitos + 3 alfanuméricos',
        });
      }

      // Evitar RFC duplicado
      const existe = await col.findOne({ rfc: rfcNorm });
      if (existe) {
        return res.status(409).json({ error: `Ya existe un cliente con el RFC ${rfcNorm}` });
      }

      // Validar que cada campo de catálogo tenga codigo y descripcion
      for (const campo of [forma_pago, metodo_pago, uso_cfdi]) {
        if (!campo.codigo || !campo.descripcion) {
          return res.status(400).json({ error: 'Datos de catálogo incompletos' });
        }
      }

      const nuevoCliente = {
        rfc: rfcNorm,
        razon_social: String(razon_social).trim(),
        forma_pago: { codigo: forma_pago.codigo, descripcion: forma_pago.descripcion },
        metodo_pago: { codigo: metodo_pago.codigo, descripcion: metodo_pago.descripcion },
        uso_cfdi: { codigo: uso_cfdi.codigo, descripcion: uso_cfdi.descripcion },
        creado_en: new Date(),
      };

      const result = await col.insertOne(nuevoCliente);
      return res.status(201).json({ _id: result.insertedId, ...nuevoCliente });
    } catch (error) {
      console.error('[clientes POST]', error);
      return res.status(500).json({ error: 'Error al guardar el cliente' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
