import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Productos() {
  const router = useRouter();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  const exito =
    router.query.exito === '1' ? 'Producto registrado correctamente.' :
    router.query.exito === '2' ? 'Producto actualizado correctamente.' : '';

  function cargarProductos() {
    setCargando(true);
    fetch('/api/productos')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setProductos(data);
      })
      .catch(() => setError('Error de conexion al obtener productos'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargarProductos(); }, []);

  async function confirmarEliminar() {
    setErrorEliminar('');
    try {
      const res = await fetch(`/api/productos/${eliminando}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setErrorEliminar(data.error || 'Error al eliminar');
        return;
      }
      setEliminando(null);
      cargarProductos();
    } catch {
      setErrorEliminar('Error de conexion');
    }
  }

  function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor || 0));
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Productos</h1>
        <Link href="/productos/nuevo" className="btn">+ Nuevo producto</Link>
      </div>

      {exito && <div className="alert alert-success">{exito}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {cargando ? (
          <p style={{ padding: 24, color: '#888' }}>Cargando productos...</p>
        ) : productos.length === 0 ? (
          <div className="empty-state">
            <p>No hay productos registrados aun.</p>
            <Link href="/productos/nuevo" className="btn">Registrar primer producto</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Precio default</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p._id}>
                    <td>{p.nombre}</td>
                    <td>{formatearMoneda(p.precio_default)}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          href={`/productos/${p._id}/editar`}
                          className="btn btn-sm"
                          aria-label="Editar producto"
                          title="Editar producto"
                        >
                          ✎
                        </Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => { setErrorEliminar(''); setEliminando(p._id); }}
                          aria-label="Eliminar producto"
                          title="Eliminar producto"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {eliminando && (
        <div className="modal-overlay" onClick={() => setEliminando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Eliminar producto</h2>
            <p>Esta accion no se puede deshacer.</p>
            {errorEliminar && <div className="alert alert-error" style={{ marginTop: 12 }}>{errorEliminar}</div>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEliminando(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmarEliminar}>
                Si, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
