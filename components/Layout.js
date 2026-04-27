import Link from 'next/link';
import { useRouter } from 'next/router';

const menu = [
  { label: 'Dashboard', href: '/', exact: true },
  { label: 'Clientes', href: '/clientes', exact: false },
  { label: 'Productos', href: '/productos', exact: false },
  { label: 'Cotizaciones', href: '/cotizaciones', exact: false },
  { label: 'Procesador IA', href: '/procesador-ia', exact: false },
  { label: 'Plantillas', href: '/plantillas-exportacion', exact: false },
];

export default function Layout({ children }) {
  const router = useRouter();

  function isActive(item) {
    if (item.exact) return router.pathname === item.href;
    return router.pathname.startsWith(item.href);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">Order Processor</span>
        </div>
        <nav className="sidebar-nav">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item) ? 'sidebar-link--active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}