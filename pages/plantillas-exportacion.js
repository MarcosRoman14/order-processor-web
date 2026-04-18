import { useEffect, useState } from 'react';

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

const initialConfig = {
  sheetName: '',
  rfcCell: 'B2',
  razonSocialCell: 'B3',
  formaPagoCell: 'B4',
  metodoPagoCell: 'B5',
  usoCfdiCell: 'B6',
  startRow: '10',
  descripcionColumn: 'A',
  cantidadColumn: 'B',
  precioUnitarioColumn: 'C',
  importeColumn: 'D',
};

export default function PlantillasExportacion() {
  const [file, setFile] = useState(null);
  const [config, setConfig] = useState(initialConfig);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activa, setActiva] = useState(null);

  useEffect(() => {
    fetch('/api/plantillas-exportacion')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && data.template) {
          setActiva(data.template);
          setConfig({
            sheetName: data.template.sheetName || '',
            rfcCell: data.template.rfcCell || 'B2',
            razonSocialCell: data.template.razonSocialCell || 'B3',
            formaPagoCell: data.template.formaPagoCell || 'B4',
            metodoPagoCell: data.template.metodoPagoCell || 'B5',
            usoCfdiCell: data.template.usoCfdiCell || 'B6',
            startRow: String(data.template.startRow || 10),
            descripcionColumn: data.template.descripcionColumn || 'A',
            cantidadColumn: data.template.cantidadColumn || 'B',
            precioUnitarioColumn: data.template.precioUnitarioColumn || 'C',
            importeColumn: data.template.importeColumn || 'D',
          });
        }
      })
      .catch(() => {});
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!file && !activa) {
      setError('Selecciona un archivo de plantilla.');
      return;
    }

    setGuardando(true);

    try {
      const base64 = file ? await fileToBase64(file) : null;

      const res = await fetch('/api/plantillas-exportacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name,
          mimeType: file?.type || null,
          base64,
          ...config,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No fue posible guardar la plantilla.');
        return;
      }

      setActiva(data.template);
      setFile(null);
      setSuccess('Plantilla guardada correctamente.');
    } catch {
      setError('Error de conexion al guardar la plantilla.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Plantillas de exportacion</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activa && (
        <div className="card">
          <p className="help-text"><strong>Plantilla activa:</strong> {activa.fileName}</p>
          <p className="help-text"><strong>Hoja:</strong> {activa.sheetName || 'Primera hoja del archivo'}</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="template-file">Archivo de plantilla Excel</label>
            <input
              id="template-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="sheetName">Hoja</label>
              <input id="sheetName" name="sheetName" value={config.sheetName} onChange={handleChange} placeholder="Hoja1" />
            </div>
            <div className="form-group">
              <label htmlFor="startRow">Fila inicial de productos</label>
              <input id="startRow" name="startRow" value={config.startRow} onChange={handleChange} placeholder="10" />
            </div>
          </div>

          <div className="section-title">Celdas de datos del cliente</div>
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label htmlFor="rfcCell">RFC</label>
              <input id="rfcCell" name="rfcCell" value={config.rfcCell} onChange={handleChange} placeholder="B2" />
            </div>
            <div className="form-group">
              <label htmlFor="razonSocialCell">Razon social</label>
              <input id="razonSocialCell" name="razonSocialCell" value={config.razonSocialCell} onChange={handleChange} placeholder="B3" />
            </div>
            <div className="form-group">
              <label htmlFor="formaPagoCell">Forma de pago</label>
              <input id="formaPagoCell" name="formaPagoCell" value={config.formaPagoCell} onChange={handleChange} placeholder="B4" />
            </div>
            <div className="form-group">
              <label htmlFor="metodoPagoCell">Metodo de pago</label>
              <input id="metodoPagoCell" name="metodoPagoCell" value={config.metodoPagoCell} onChange={handleChange} placeholder="B5" />
            </div>
            <div className="form-group">
              <label htmlFor="usoCfdiCell">Uso CFDI</label>
              <input id="usoCfdiCell" name="usoCfdiCell" value={config.usoCfdiCell} onChange={handleChange} placeholder="B6" />
            </div>
          </div>

          <div className="section-title">Columnas del detalle</div>
          <div className="form-grid form-grid-4">
            <div className="form-group">
              <label htmlFor="descripcionColumn">Descripcion</label>
              <input id="descripcionColumn" name="descripcionColumn" value={config.descripcionColumn} onChange={handleChange} placeholder="A" />
            </div>
            <div className="form-group">
              <label htmlFor="cantidadColumn">Cantidad</label>
              <input id="cantidadColumn" name="cantidadColumn" value={config.cantidadColumn} onChange={handleChange} placeholder="B" />
            </div>
            <div className="form-group">
              <label htmlFor="precioUnitarioColumn">Precio unitario</label>
              <input id="precioUnitarioColumn" name="precioUnitarioColumn" value={config.precioUnitarioColumn} onChange={handleChange} placeholder="C" />
            </div>
            <div className="form-group">
              <label htmlFor="importeColumn">Importe</label>
              <input id="importeColumn" name="importeColumn" value={config.importeColumn} onChange={handleChange} placeholder="D" />
            </div>
          </div>

          <button type="submit" className="btn" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar plantilla'}
          </button>
        </form>
      </div>
    </div>
  );
}
