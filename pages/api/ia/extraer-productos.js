const BASE_PROMPT =
  'Regresa una lista de productos con el formato: descripcion;cantidad;precio unitario y cada conjunto separado por pipes, tu respuesta solo debe ser la lista de productos, cantidad y precio unitario no deben contener nada mas que numeros concretos:';

function parseModelOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  return rawText
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [descripcion = '', cantidad = '', precio_unitario = ''] = line
        .split(';')
        .map((part) => part.trim());

      return {
        descripcion,
        cantidad,
        precio_unitario,
      };
    })
    .filter((item) => item.descripcion || item.cantidad || item.precio_unitario);
}

function collectTextFromCandidate(candidate) {
  const parts = candidate?.content?.parts || [];
  return parts.map((p) => p?.text || '').join('\n').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY' });
  }

  const { fileName, mimeType, base64 } = req.body ?? {};

  if (!fileName || !mimeType || !base64) {
    return res.status(400).json({ error: 'Archivo incompleto' });
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${BASE_PROMPT} Analiza el archivo ${fileName} y responde solo en ese formato, sin encabezados ni comentarios.`,
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      const detail = data?.error?.message || 'Error al consultar Gemini';
      return res.status(502).json({ error: detail });
    }

    const text = collectTextFromCandidate(data?.candidates?.[0]);
    const productos = parseModelOutput(text);

    if (productos.length === 0) {
      return res.status(422).json({
        error: 'No fue posible extraer productos del archivo. Intenta con otro archivo o revisa su calidad.',
        raw: text,
      });
    }

    return res.status(200).json({ productos, raw: text });
  } catch (error) {
    console.error('[ia/extraer-productos]', error);
    return res.status(500).json({ error: 'Error interno al procesar el archivo' });
  }
}
