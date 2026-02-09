import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__inner">
          <Link to="/" className="brand">
            Heal Meat
          </Link>
          <nav className="top-nav">
            <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Planner
            </NavLink>
            <NavLink
              to="/income"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Income
            </NavLink>
            <NavLink
              to="/clients"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Clients
            </NavLink>
          </nav>
          <button type="button" className="button ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
