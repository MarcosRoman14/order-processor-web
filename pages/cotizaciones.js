import { useEffect, useMemo, useState } from 'react';

function createItem(producto, precioOverride = null) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productoId: producto._id,
    nombre: producto.nombre,
    precio: precioOverride !== null ? precioOverride : Number(producto.precio_default || 0),
    relacionar_precio: true,
  };
}

export default function Cotizaciones() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [preciosCliente, setPreciosCliente] = useState({});
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/clientes').then((r) => r.json()),
      fetch('/api/productos').then((r) => r.json()),
    ])
      .then(([clientesData, productosData]) => {
        if (clientesData.error) {
          setError(clientesData.error);
          return;
        }
        if (productosData.error) {
          setError(productosData.error);
          return;
        }
        setClientes(clientesData);
        setProductos(productosData);
      })
      .catch(() => setError('Error de conexion al cargar datos'))
      .finally(() => setCargando(false));
  }, []);

  // Cargar el último precio usado por este cliente para cada producto
  useEffect(() => {
    if (!clienteId) {
      setPreciosCliente({});
      return;
    }
    fetch(`/api/cotizaciones/precios-cliente?clienteId=${clienteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          const mapa = {};
          data.forEach((p) => { mapa[p.nombre_lower] = p.precio; });
          setPreciosCliente(mapa);
        }
      })
      .catch(() => {});
  }, [clienteId]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => c._id === clienteId) || null,
    [clientes, clienteId]
  );

  const sugerencias = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (term.length < 3) return [];

    return productos
      .filter((p) => p.nombre.toLowerCase().includes(term))
      .slice(0, 8);
  }, [productos, busqueda]);

  useEffect(() => {
    // Resetear índice cuando cambian las sugerencias para que Enter
    // no seleccione automáticamente la primera opción sin que el usuario navegue
    setIndiceActivo(-1);
  }, [sugerencias]);

  function seleccionarProducto(producto) {
    setProductoSeleccionadoId(producto._id);
    setBusqueda(producto.nombre);
    setMostrarSugerencias(false);
    setIndiceActivo(-1);
  }

  function handleBusquedaKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sugerencias.length > 0)
        setIndiceActivo((prev) => (prev + 1 >= sugerencias.length ? 0 : prev + 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sugerencias.length > 0)
        setIndiceActivo((prev) => (prev - 1 < 0 ? sugerencias.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceActivo >= 0 && sugerencias[indiceActivo]) {
        // Usuario navegó con flechas: insertar el resaltado
        agregarProducto(sugerencias[indiceActivo]);
      } else {
        // Sin navegación: insertar con el texto escrito (busca exacto o crea custom)
        agregarProducto();
      }
    }
  }

  function agregarProducto(productoDirecto = null) {
    setError('');

    if (!clienteId) {
      setError('Selecciona un cliente antes de agregar productos.');
      return;
    }

    let producto = productoDirecto
      || productos.find((p) => p._id === productoSeleccionadoId)
      || (busqueda.trim()
        ? productos.find((p) => p.nombre.toLowerCase() === busqueda.trim().toLowerCase())
        : null);

    if (!producto) {
      if (!busqueda.trim()) {
        setError('Escribe el nombre del producto que deseas agregar.');
        return;
      }
      producto = { _id: `custom-${Date.now()}`, nombre: busqueda.trim(), precio_default: 0 };
    }

    const nombreProducto = (producto.nombre || '').toLowerCase();
    const existe = items.some((item) => (item.nombre || '').toLowerCase() === nombreProducto);
    if (existe) {
      setError('Ese producto ya esta en la cotizacion.');
      return;
    }

    const nombreLower = (producto.nombre || '').toLowerCase();
    const precioOverride = Object.prototype.hasOwnProperty.call(preciosCliente, nombreLower)
      ? preciosCliente[nombreLower]
      : null;
    setItems((prev) => [...prev, createItem(producto, precioOverride)]);
    setBusqueda('');
    setProductoSeleccionadoId('');
    setMostrarSugerencias(false);
    setIndiceActivo(-1);
  }

  function eliminarItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function actualizarItem(id, campo, valor) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (campo === 'precio') {
          const numero = Number(valor);
          return {
            ...item,
            precio: Number.isFinite(numero) && numero >= 0 ? numero : 0,
          };
        }

        return { ...item, [campo]: valor };
      })
    );
  }

  function exportar() {
    setError('');
    if (!clienteSeleccionado) {
      setError('Selecciona un cliente antes de exportar.');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un producto para exportar.');
      return;
    }
    setMostrarModalExportar(true);
  }

  async function confirmarExportar() {
    setExportando(true);
    setError('');
    try {
      // 1. Guardar productos nuevos y relaciones cliente-precio
      const saveRes = await fetch('/api/cotizaciones/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: clienteSeleccionado._id, items }),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json();
        setError(data.error || 'Error al guardar cotizacion');
        return;
      }

      // Actualizar precios en memoria para reflejar los recién guardados
      const nuevoMapa = { ...preciosCliente };
      items.forEach((item) => {
        if (item.relacionar_precio) {
          nuevoMapa[(item.nombre || '').toLowerCase()] = item.precio;
        }
      });
      setPreciosCliente(nuevoMapa);

      // 2. Descargar Excel
      const response = await fetch('/api/exportaciones/cotizaciones-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            clienteId: clienteSeleccionado._id,
            nombreCliente: `${clienteSeleccionado.rfc} - ${clienteSeleccionado.razon_social}`,
          },
          rows: items,
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
      const fileBase = `${clienteSeleccionado.rfc || 'cliente'}_${clienteSeleccionado.razon_social || 'cotizacion'}`
        .replace(/[^a-zA-Z0-9-_]+/g, '_');
      link.href = url;
      link.download = `cotizacion_${fileBase}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMostrarModalExportar(false);
    } catch {
      setError('Error de conexion al exportar.');
    } finally {
      setExportando(false);
    }
  }

  const conteoRelacionados = items.filter((i) => i.relacionar_precio).length;
  const conteoNuevos = items.filter((i) => String(i.productoId || '').startsWith('custom-')).length;

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Cotizaciones</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label htmlFor="cliente">Cliente</label>
            <select
              id="cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              disabled={cargando}
            >
              <option value="">{cargando ? 'Cargando...' : '-- Selecciona un cliente --'}</option>
              {clientes.map((cliente) => (
                <option key={cliente._id} value={cliente._id}>
                  {cliente.rfc} - {cliente.razon_social}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="toolbar-row">
          <div>
            <strong>Productos de cotizacion</strong>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="btn" onClick={exportar} disabled={exportando} title="Exportar a Excel">
              {exportando ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
            </button>
          </div>
        </div>

        <div style={{ padding: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="buscadorProducto">Buscar producto por nombre</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="combobox-wrap">
                <input
                  id="buscadorProducto"
                  value={busqueda}
                  onFocus={() => setMostrarSugerencias(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 140)}
                  onKeyDown={handleBusquedaKeyDown}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setProductoSeleccionadoId('');
                    setMostrarSugerencias(true);
                  }}
                  placeholder="Escribe al menos 3 letras para buscar"
                  autoComplete="off"
                />

                {mostrarSugerencias && (
                  <div className="combobox-list" role="listbox">
                    {sugerencias.length === 0 ? (
                      <div className="combobox-item combobox-item--empty">No hay coincidencias</div>
                    ) : (
                      sugerencias.map((producto, index) => (
                        <button
                          key={producto._id}
                          type="button"
                          role="option"
                          className={`combobox-item ${index === indiceActivo ? 'combobox-item--active' : ''}`}
                          onMouseEnter={() => setIndiceActivo(index)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => seleccionarProducto(producto)}
                        >
                          <span>{producto.nombre}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button type="button" className="btn" onClick={agregarProducto}>+</button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p>No hay productos agregados.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 200 }}>Relacion</th>
                  <th>Producto</th>
                  <th style={{ width: 180 }}>Precio</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
                        <input
                          type="checkbox"
                          checked={item.relacionar_precio}
                          onChange={(e) => actualizarItem(item.id, 'relacionar_precio', e.target.checked)}
                          title="El precio de este producto se relacionara a este cliente"
                        />
                      </label>
                    </td>
                    <td>{item.nombre}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio}
                        onChange={(e) => actualizarItem(item.id, 'precio', e.target.value)}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => eliminarItem(item.id)} title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarModalExportar && (
        <div className="modal-overlay" onClick={() => !exportando && setMostrarModalExportar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar exportacion</h2>
            <p>
              Los precios de{' '}
              <strong>{conteoRelacionados} producto{conteoRelacionados !== 1 ? 's' : ''}</strong>{' '}
              se ligaran al cliente{' '}
              <strong>&quot;{clienteSeleccionado?.rfc} - {clienteSeleccionado?.razon_social}&quot;</strong>.
            </p>
            {conteoNuevos > 0 && (
              <p style={{ marginTop: 8 }}>
                Ademas se guardaran{' '}
                <strong>{conteoNuevos} producto{conteoNuevos !== 1 ? 's' : ''} nuevo{conteoNuevos !== 1 ? 's' : ''}</strong>{' '}
                en el catalogo de productos.
              </p>
            )}
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                disabled={exportando}
                onClick={() => setMostrarModalExportar(false)}
              >
                Cancelar
              </button>
              <button className="btn" disabled={exportando} onClick={confirmarExportar}>
                {exportando ? 'Procesando...' : 'Confirmar y exportar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
