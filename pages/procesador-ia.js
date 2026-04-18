import { useMemo, useState } from 'react';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY_ROW = {
  descripcion: '',
  cantidad: '',
  precio_unitario: '',
};

export default function ProcesadorIa() {
  const [file, setFile] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const total = useMemo(() => {
    return rows.reduce((sum, row) => {
      const qty = Number(row.cantidad || 0);
      const price = Number(row.precio_unitario || 0);
      return sum + qty * price;
    }, 0);
  }, [rows]);

  function onFileChange(event) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setError('');
  }

  function onCellChange(index, field, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function procesarArchivo() {
    if (!file) {
      setError('Selecciona un archivo antes de procesar.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('El archivo excede 8MB. Usa un archivo mas pequeno.');
      return;
    }

    setError('');
    setProcesando(true);

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch('/api/ia/extraer-productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No fue posible procesar el archivo.');
        return;
      }

      setRows(data.productos || []);
    } catch {
      setError('Error de conexion al procesar el archivo.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Procesador IA</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="upload-row">
          <input
            type="file"
            onChange={onFileChange}
            className="file-input"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
          />
          <button type="button" className="btn" onClick={procesarArchivo} disabled={procesando}>
            {procesando ? 'Procesando...' : 'Procesar con IA'}
          </button>
        </div>

        <p className="help-text">
          Sube un archivo y se extraeran productos con el formato descripcion, cantidad y precio unitario.
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty-state">
            <p>Aun no hay resultados para mostrar.</p>
            <button type="button" className="btn btn-secondary" onClick={addRow}>
              Agregar fila manualmente
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="col-descripcion">Descripcion</th>
                  <th className="col-cantidad">Cantidad</th>
                  <th className="col-precio">Precio unitario</th>
                  <th className="col-importe">Importe</th>
                  <th className="col-acciones"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const qty = Number(row.cantidad || 0);
                  const price = Number(row.precio_unitario || 0);
                  const importe = qty * price;

                  return (
                    <tr key={`${index}-${row.descripcion}`}>
                      <td className="col-descripcion">
                        <input
                          value={row.descripcion}
                          onChange={(e) => onCellChange(index, 'descripcion', e.target.value)}
                          className="grid-input"
                        />
                      </td>
                      <td className="col-cantidad">
                        <input
                          value={row.cantidad}
                          onChange={(e) => onCellChange(index, 'cantidad', e.target.value)}
                          className="grid-input"
                        />
                      </td>
                      <td className="col-precio">
                        <input
                          value={row.precio_unitario}
                          onChange={(e) => onCellChange(index, 'precio_unitario', e.target.value)}
                          className="grid-input"
                        />
                      </td>
                      <td className="col-importe">{Number.isFinite(importe) ? importe.toFixed(2) : '0.00'}</td>
                      <td className="col-acciones">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeRow(index)}
                          aria-label="Eliminar fila"
                          title="Eliminar fila"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="grid-footer">
              <button type="button" className="btn btn-secondary" onClick={addRow}>
                Agregar fila
              </button>
              <strong>Total: {total.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
