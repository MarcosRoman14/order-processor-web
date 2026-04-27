import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const formInicial = {
  nombre: '',
  precio_default: '',
};

export default function NuevoProducto() {
  const router = useRouter();
  const [form, setForm] = useState(formInicial);
  const [errores, setErrores] = useState({});
  const [alertaGlobal, setAlertaGlobal] = useState('');
  const [enviando, setEnviando] = useState(false);

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
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          precio_default: Number(form.precio_default),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAlertaGlobal(data.error || 'Error al guardar el producto');
        return;
      }

      router.push('/productos?exito=1');
    } catch {
      setAlertaGlobal('Error de conexion. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Nuevo producto</h1>
        <Link href="/productos" className="btn btn-secondary">
          Volver
        </Link>
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
            {enviando ? 'Guardando...' : 'Guardar producto'}
          </button>
        </form>
      </div>
    </div>
  );
}
