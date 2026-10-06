import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  ['/', 'Dashboard', 'ڈیش بورڈ'],
  ['/customers', 'Customers', 'گاہک'],
  ['/products', 'Items', 'اشیاء']
];

export default function Layout({ children }) {
  const { admin, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  return <>
    <header className="nav">
      <Link className="brand" to="/">🥬 FreshMart Admin</Link>
      {admin && <nav>
        {navItems.map(([path, en, ur]) => <Link className={location.pathname === path || (path !== '/' && location.pathname.startsWith(path)) ? 'active' : ''} to={path} key={path}><span>{en}</span><small>{ur}</small></Link>)}
        <button onClick={() => { logout(); nav('/login'); }}><span>Logout</span><small>لاگ آؤٹ</small></button>
      </nav>}
    </header>
    {children}
  </>;
}
