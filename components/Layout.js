import Link from 'next/link';
import { useRouter } from 'next/router';

const menu = [
  { label: 'Dashboard', href: '/',         icon: '⊞', exact: true  },
  { label: 'Clientes',  href: '/clientes', icon: '👥', exact: false },
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
          <span className="sidebar-logo-icon">📋</span>
          <span className="sidebar-logo-text">Order Processor</span>
        </div>
        <nav className="sidebar-nav">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item) ? 'sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}