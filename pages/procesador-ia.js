import { useEffect, useMemo, useState } from 'react';

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

const EMPTY_EXPORT_FORM = {
  clienteId: '',
  rfc: '',
  razon_social: '',
  forma_pago: '',
  metodo_pago: '',
  uso_cfdi: '',
};

export default function ProcesadorIa() {
  const [file, setFile] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [templateInfo, setTemplateInfo] = useState(null);
  const [exportForm, setExportForm] = useState(EMPTY_EXPORT_FORM);

  useEffect(() => {
    fetch('/api/plantillas-exportacion')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setTemplateInfo(data.template || null);
      })
      .catch(() => {});
  }, []);

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

  function onExportFieldChange(event) {
    const { name, value } = event.target;

    if (name === 'clienteId') {
      const cliente = clientes.find((item) => item._id === value);
      if (!cliente) {
        setExportForm((prev) => ({ ...prev, clienteId: value }));
        return;
      }

      setExportForm({
        clienteId: value,
        rfc: cliente.rfc || '',
        razon_social: cliente.razon_social || '',
        forma_pago: `${cliente.forma_pago?.codigo || ''} ${cliente.forma_pago?.descripcion || ''}`.trim(),
        metodo_pago: `${cliente.metodo_pago?.codigo || ''} ${cliente.metodo_pago?.descripcion || ''}`.trim(),
        uso_cfdi: `${cliente.uso_cfdi?.codigo || ''} ${cliente.uso_cfdi?.descripcion || ''}`.trim(),
      });
      return;
    }

    setExportForm((prev) => ({ ...prev, [name]: value }));
  }

  async function openExportPanel() {
    setError('');
    setShowExportPanel(true);

    if (clientes.length > 0 || loadingClientes) return;

    setLoadingClientes(true);
    try {
      const res = await fetch('/api/clientes');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No fue posible obtener los clientes.');
        return;
      }
      setClientes(data);
    } catch {
      setError('Error de conexion al obtener clientes.');
    } finally {
      setLoadingClientes(false);
    }
  }

  async function exportarExcel() {
    setError('');

    if (!templateInfo) {
      setError('Primero configura una plantilla de exportacion.');
      return;
    }

    if (!exportForm.rfc || !exportForm.razon_social) {
      setError('Completa la informacion del cliente antes de exportar.');
      return;
    }

    if (rows.length === 0) {
      setError('No hay filas para exportar.');
      return;
    }

    setExporting(true);
    try {
      const response = await fetch('/api/exportaciones/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            rfc: exportForm.rfc,
            razon_social: exportForm.razon_social,
            forma_pago: exportForm.forma_pago,
            metodo_pago: exportForm.metodo_pago,
            uso_cfdi: exportForm.uso_cfdi,
          },
          rows,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'No fue posible exportar el archivo.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (exportForm.razon_social || 'exportacion').replace(/[^a-zA-Z0-9-_]+/g, '_');
      link.href = url;
      link.download = `${safeName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportPanel(false);
    } catch {
      setError('Error de conexion al exportar el archivo.');
    } finally {
      setExporting(false);
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
            <div className="toolbar-row">
              <div>
                <strong>Detalle de productos</strong>
              </div>
              <div className="toolbar-actions">
                <button type="button" className="btn btn-secondary" onClick={addRow}>
                  Agregar fila
                </button>
                <button type="button" className="btn" onClick={openExportPanel}>
                  Exportar
                </button>
              </div>
            </div>

            {showExportPanel && (
              <div className="export-panel">
                {!templateInfo && (
                  <div className="alert alert-error">
                    No hay plantilla activa. Primero carga una en la seccion Plantillas.
                  </div>
                )}

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label htmlFor="clienteId">Cliente</label>
                    <select
                      id="clienteId"
                      name="clienteId"
                      value={exportForm.clienteId}
                      onChange={onExportFieldChange}
                      disabled={loadingClientes}
                    >
                      <option value="">{loadingClientes ? 'Cargando clientes...' : '-- Selecciona un cliente --'}</option>
                      {clientes.map((cliente) => (
                        <option key={cliente._id} value={cliente._id}>
                          {cliente.rfc} - {cliente.razon_social}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rfc">RFC</label>
                    <input id="rfc" name="rfc" value={exportForm.rfc} onChange={onExportFieldChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="razon_social">Razon social</label>
                    <input id="razon_social" name="razon_social" value={exportForm.razon_social} onChange={onExportFieldChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="forma_pago">Forma de pago</label>
                    <input id="forma_pago" name="forma_pago" value={exportForm.forma_pago} onChange={onExportFieldChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="metodo_pago">Metodo de pago</label>
                    <input id="metodo_pago" name="metodo_pago" value={exportForm.metodo_pago} onChange={onExportFieldChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="uso_cfdi">Uso CFDI</label>
                    <input id="uso_cfdi" name="uso_cfdi" value={exportForm.uso_cfdi} onChange={onExportFieldChange} />
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowExportPanel(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn" onClick={exportarExcel} disabled={exporting || !templateInfo}>
                    {exporting ? 'Exportando...' : 'Confirmar exportacion'}
                  </button>
                </div>
              </div>
            )}

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
              <span>{templateInfo ? `Plantilla activa: ${templateInfo.fileName}` : 'Sin plantilla activa'}</span>
              <strong>Total: {total.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
