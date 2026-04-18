import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Clientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState(null);   // id del cliente a eliminar
  const [errorEliminar, setErrorEliminar] = useState('');

  const exito =
    router.query.exito === '1' ? 'Cliente registrado correctamente.' :
    router.query.exito === '2' ? 'Cliente actualizado correctamente.' : '';

  function cargarClientes() {
    setCargando(true);
    fetch('/api/clientes')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setClientes(data);
      })
      .catch(() => setError('Error de conexión al obtener clientes'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargarClientes(); }, []);

  async function confirmarEliminar() {
    setErrorEliminar('');
    try {
      const res = await fetch(`/api/clientes/${eliminando}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setErrorEliminar(data.error || 'Error al eliminar');
        return;
      }
      setEliminando(null);
      cargarClientes();
    } catch {
      setErrorEliminar('Error de conexión');
    }
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Clientes</h1>
        <Link href="/clientes/nuevo" className="btn">+ Nuevo cliente</Link>
      </div>

      {exito && <div className="alert alert-success">{exito}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {cargando ? (
          <p style={{ padding: 24, color: '#888' }}>Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <div className="empty-state">
            <p>No hay clientes registrados aún.</p>
            <Link href="/clientes/nuevo" className="btn">Registrar primer cliente</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>RFC</th>
                  <th>Razón Social</th>
                  <th>Forma de Pago</th>
                  <th>Método de Pago</th>
                  <th>Uso CFDI</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c._id}>
                    <td><code style={{ fontSize: '0.9rem' }}>{c.rfc}</code></td>
                    <td>{c.razon_social}</td>
                    <td>{c.forma_pago?.codigo} – {c.forma_pago?.descripcion}</td>
                    <td>{c.metodo_pago?.codigo} – {c.metodo_pago?.descripcion}</td>
                    <td>{c.uso_cfdi?.codigo} – {c.uso_cfdi?.descripcion}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          href={`/clientes/${c._id}/editar`}
                          className="btn btn-sm"
                          aria-label="Editar cliente"
                          title="Editar cliente"
                        >
                          ✎
                        </Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => { setErrorEliminar(''); setEliminando(c._id); }}
                          aria-label="Eliminar cliente"
                          title="Eliminar cliente"
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

      {/* Modal de confirmación de eliminación */}
      {eliminando && (
        <div className="modal-overlay" onClick={() => setEliminando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>¿Eliminar cliente?</h2>
            <p>Esta acción no se puede deshacer.</p>
            {errorEliminar && <div className="alert alert-error" style={{ marginTop: 12 }}>{errorEliminar}</div>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEliminando(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmarEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}