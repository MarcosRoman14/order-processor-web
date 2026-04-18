import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const CAMPOS_CATALOGO = ['forma_pago', 'metodo_pago', 'uso_cfdi'];
const LABELS = {
  forma_pago: 'Forma de pago',
  metodo_pago: 'Método de pago',
  uso_cfdi: 'Uso CFDI',
};

export default function EditarCliente() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState(null);
  const [catalogos, setCatalogos] = useState({});
  const [errores, setErrores] = useState({});
  const [alertaGlobal, setAlertaGlobal] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/clientes/${id}`).then((r) => r.json()),
      fetch('/api/catalogos').then((r) => r.json()),
    ])
      .then(([cliente, cats]) => {
        if (cliente.error) { setAlertaGlobal(cliente.error); return; }
        if (cats.error)    { setAlertaGlobal('Error al cargar catálogos'); return; }
        setCatalogos(cats);
        setForm({
          rfc: cliente.rfc,
          razon_social: cliente.razon_social,
          forma_pago: cliente.forma_pago?.codigo ?? '',
          metodo_pago: cliente.metodo_pago?.codigo ?? '',
          uso_cfdi: cliente.uso_cfdi?.codigo ?? '',
        });
      })
      .catch(() => setAlertaGlobal('Error de conexión'))
      .finally(() => setCargando(false));
  }, [id]);

  function validar() {
    const e = {};
    const rfcNorm = form.rfc.toUpperCase().trim();
    if (!rfcNorm) e.rfc = 'El RFC es obligatorio';
    else if (!RFC_REGEX.test(rfcNorm)) e.rfc = 'RFC inválido';
    if (!form.razon_social.trim()) e.razon_social = 'La razón social es obligatoria';
    CAMPOS_CATALOGO.forEach((campo) => {
      if (!form[campo]) e[campo] = `Selecciona ${LABELS[campo]}`;
    });
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validacion = validar();
    if (Object.keys(validacion).length > 0) { setErrores(validacion); return; }

    const payload = {
      rfc: form.rfc.toUpperCase().trim(),
      razon_social: form.razon_social.trim(),
    };
    CAMPOS_CATALOGO.forEach((campo) => {
      const item = (catalogos[campo] || []).find((c) => c.codigo === form[campo]);
      payload[campo] = item || { codigo: form[campo], descripcion: '' };
    });

    setEnviando(true);
    setAlertaGlobal('');
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setAlertaGlobal(data.error || 'Error al actualizar'); return; }
      router.push('/clientes?exito=2');
    } catch {
      setAlertaGlobal('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <div className="container"><p style={{ color: '#888', marginTop: 24 }}>Cargando...</p></div>;

  if (!form) return (
    <div className="container">
      {alertaGlobal && <div className="alert alert-error">{alertaGlobal}</div>}
    </div>
  );

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Editar cliente</h1>
        <Link href="/clientes" className="btn btn-secondary">← Volver</Link>
      </div>

      {alertaGlobal && <div className="alert alert-error">{alertaGlobal}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="rfc">RFC *</label>
            <input
              id="rfc" name="rfc" value={form.rfc} onChange={handleChange}
              placeholder="XAXX010101000" maxLength={13}
              style={{ textTransform: 'uppercase' }} autoComplete="off"
            />
            {errores.rfc && <p className="field-error">{errores.rfc}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="razon_social">Razón social *</label>
            <input
              id="razon_social" name="razon_social" value={form.razon_social}
              onChange={handleChange} placeholder="Mi Empresa SA de CV" maxLength={200}
            />
            {errores.razon_social && <p className="field-error">{errores.razon_social}</p>}
          </div>

          {CAMPOS_CATALOGO.map((campo) => (
            <div className="form-group" key={campo}>
              <label htmlFor={campo}>{LABELS[campo]} *</label>
              <select id={campo} name={campo} value={form[campo]} onChange={handleChange}>
                <option value="">-- Selecciona --</option>
                {(catalogos[campo] || []).map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {item.codigo} – {item.descripcion}
                  </option>
                ))}
              </select>
              {errores[campo] && <p className="field-error">{errores[campo]}</p>}
            </div>
          ))}

          <button type="submit" className="btn" disabled={enviando} style={{ marginTop: 8 }}>
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}