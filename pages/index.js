import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const exito = router.query.exito === '1';

  useEffect(() => {
    fetch('/api/clientes')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setClientes(data);
      })
      .catch(() => setError('Error de conexión al obtener clientes'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Clientes</h1>
        <Link href="/clientes/nuevo" className="btn">
          + Nuevo cliente
        </Link>
      </div>

      {exito && (
        <div className="alert alert-success">
          ✅ Cliente registrado correctamente.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {cargando ? (
          <p style={{ padding: 24, color: '#888' }}>Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <div className="empty-state">
            <p>No hay clientes registrados aún.</p>
            <Link href="/clientes/nuevo" className="btn">
              Registrar primer cliente
            </Link>
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
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <code style={{ fontSize: '0.9rem' }}>{c.rfc}</code>
                    </td>
                    <td>{c.razon_social}</td>
                    <td>{c.forma_pago?.codigo} – {c.forma_pago?.descripcion}</td>
                    <td>{c.metodo_pago?.codigo} – {c.metodo_pago?.descripcion}</td>
                    <td>{c.uso_cfdi?.codigo} – {c.uso_cfdi?.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
