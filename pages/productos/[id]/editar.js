import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function EditarProducto() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [alertaGlobal, setAlertaGlobal] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/productos/${id}`)
      .then((r) => r.json())
      .then((producto) => {
        if (producto.error) {
          setAlertaGlobal(producto.error);
          return;
        }

        setForm({
          nombre: producto.nombre || '',
          precio_default: String(producto.precio_default ?? ''),
        });
      })
      .catch(() => setAlertaGlobal('Error de conexion'))
      .finally(() => setCargando(false));
  }, [id]);

  function validar() {
    const e = {};
    const nombre = form.nombre.trim();
    const precio = Number(form.precio_default);

    if (!nombre) e.nombre = 'El nombre es obligatorio';
    if (form.precio_default === '') {
      e.precio_default = 'El precio default es obligatorio';
    } else if (!Number.isFinite(precio) || precio < 0) {
      e.precio_default = 'Ingresa un precio valido mayor o igual a 0';
    }

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
    if (Object.keys(validacion).length > 0) {
      setErrores(validacion);
      return;
    }

    setEnviando(true);
    setAlertaGlobal('');

    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          precio_default: Number(form.precio_default),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAlertaGlobal(data.error || 'Error al actualizar producto');
        return;
      }

      router.push('/productos?exito=2');
    } catch {
      setAlertaGlobal('Error de conexion. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <div className="container"><p style={{ color: '#888', marginTop: 24 }}>Cargando...</p></div>;

  if (!form) {
    return (
      <div className="container">
        {alertaGlobal && <div className="alert alert-error">{alertaGlobal}</div>}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Editar producto</h1>
        <Link href="/productos" className="btn btn-secondary">Volver</Link>
      </div>

      {alertaGlobal && <div className="alert alert-error">{alertaGlobal}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Nombre del producto"
              maxLength={120}
            />
            {errores.nombre && <p className="field-error">{errores.nombre}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="precio_default">Precio default *</label>
            <input
              id="precio_default"
              name="precio_default"
              type="number"
              step="0.01"
              min="0"
              value={form.precio_default}
              onChange={handleChange}
              placeholder="0.00"
            />
            {errores.precio_default && <p className="field-error">{errores.precio_default}</p>}
          </div>

          <button type="submit" className="btn" disabled={enviando} style={{ marginTop: 8 }}>
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
