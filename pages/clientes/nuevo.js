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

const formInicial = {
    rfc: '',
    razon_social: '',
    forma_pago: '',
    metodo_pago: '',
    uso_cfdi: '',
};

export default function NuevoCliente() {
    const router = useRouter();
    const [form, setForm] = useState(formInicial);
    const [catalogos, setCatalogos] = useState({});
    const [errores, setErrores] = useState({});
    const [alertaGlobal, setAlertaGlobal] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

    useEffect(() => {
        fetch('/api/catalogos')
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setAlertaGlobal('Error al cargar catálogos. Recarga la página.');
                } else {
                    setCatalogos(data);
                }
            })
            .catch(() => setAlertaGlobal('Error de conexión al cargar catálogos.'))
            .finally(() => setCargandoCatalogos(false));
    }, []);

    function validar() {
        const e = {};
        const rfcNorm = form.rfc.toUpperCase().trim();

        if (!rfcNorm) {
            e.rfc = 'El RFC es obligatorio';
        } else if (!RFC_REGEX.test(rfcNorm)) {
            e.rfc = 'RFC inválido. Ejemplo personas morales: ABC010101XYZ (12 chars), personas físicas: ABCD010101XYZ (13 chars)';
        }

        if (!form.razon_social.trim()) {
            e.razon_social = 'La razón social es obligatoria';
        }

        CAMPOS_CATALOGO.forEach((campo) => {
            if (!form[campo]) e[campo] = `Selecciona ${LABELS[campo]}`;
        });

        return e;
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Limpiar error del campo al editar
        if (errores[name]) {
            setErrores((prev) => ({ ...prev, [name]: '' }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const validacion = validar();
        if (Object.keys(validacion).length > 0) {
            setErrores(validacion);
            return;
        }

        // Construir payload: para cada catálogo guardamos { codigo, descripcion }
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
            const res = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setAlertaGlobal(data.error || 'Error al guardar el cliente');
                return;
            }

            router.push('/clientes?exito=1');
        } catch {
            setAlertaGlobal('Error de conexión. Intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="container">
            <div className="top-bar">
                <h1>Nuevo cliente</h1>
                <Link href="/" className="btn btn-secondary">
                    ← Volver
                </Link>
            </div>

            {alertaGlobal && <div className="alert alert-error">{alertaGlobal}</div>}

            <div className="card">
                <form onSubmit={handleSubmit} noValidate>
                    {/* RFC */}
                    <div className="form-group">
                        <label htmlFor="rfc">RFC *</label>
                        <input
                            id="rfc"
                            name="rfc"
                            value={form.rfc}
                            onChange={handleChange}
                            placeholder="XAXX010101000"
                            maxLength={13}
                            style={{ textTransform: 'uppercase' }}
                            autoComplete="off"
                        />
                        {errores.rfc && <p className="field-error">{errores.rfc}</p>}
                    </div>

                    {/* Razón social */}
                    <div className="form-group">
                        <label htmlFor="razon_social">Razón social *</label>
                        <input
                            id="razon_social"
                            name="razon_social"
                            value={form.razon_social}
                            onChange={handleChange}
                            placeholder="Mi Empresa SA de CV"
                            maxLength={200}
                        />
                        {errores.razon_social && (
                            <p className="field-error">{errores.razon_social}</p>
                        )}
                    </div>

                    {/* Catálogos */}
                    {CAMPOS_CATALOGO.map((campo) => (
                        <div className="form-group" key={campo}>
                            <label htmlFor={campo}>{LABELS[campo]} *</label>
                            <select
                                id={campo}
                                name={campo}
                                value={form[campo]}
                                onChange={handleChange}
                                disabled={cargandoCatalogos}
                            >
                                <option value="">
                                    {cargandoCatalogos ? 'Cargando...' : '-- Selecciona --'}
                                </option>
                                {(catalogos[campo] || []).map((item) => (
                                    <option key={item.codigo} value={item.codigo}>
                                        {item.codigo} – {item.descripcion}
                                    </option>
                                ))}
                            </select>
                            {errores[campo] && (
                                <p className="field-error">{errores[campo]}</p>
                            )}
                        </div>
                    ))}

                    <button
                        type="submit"
                        className="btn"
                        disabled={enviando || cargandoCatalogos}
                        style={{ marginTop: 8 }}
                    >
                        {enviando ? 'Guardando...' : 'Guardar cliente'}
                    </button>
                </form>
            </div>
        </div>
    );
}
