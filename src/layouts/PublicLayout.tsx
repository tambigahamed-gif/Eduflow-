import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Brand } from '../components/Brand';

const navigation = [
  { to: '/features', label: 'Découvrir' },
  { to: '/about', label: 'Notre vision' },
  { to: '/pricing', label: 'Tarifs' },
  { to: '/faq', label: 'FAQ' },
];

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a href="#main-content" className="skip-link">Aller au contenu</a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav id="main-navigation" className={`main-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Navigation principale">
            <div className="nav-links">
              {navigation.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="nav-actions">
              <Link className="nav-login" to="/login" onClick={closeMenu}>Se connecter</Link>
              <Link className="button button-small button-primary" to="/register" onClick={closeMenu}>Créer un compte <ArrowRight size={15} /></Link>
            </div>
          </nav>
        </div>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-top page-wrap">
          <div className="footer-brand-block">
            <Brand light />
            <p>Un espace pour apprendre, comprendre et avancer avec confiance.</p>
          </div>
          <div className="footer-column">
            <strong>Explorer</strong>
            <Link to="/features">Fonctionnalités</Link>
            <Link to="/pricing">Tarifs proposés</Link>
            <Link to="/faq">Questions fréquentes</Link>
          </div>
          <div className="footer-column">
            <strong>EduFlow</strong>
            <Link to="/about">Notre vision</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Mon espace</Link>
          </div>
          <div className="footer-column">
            <strong>Informations</strong>
            <Link to="/privacy">Confidentialité</Link>
            <Link to="/terms">Conditions d’utilisation</Link>
          </div>
        </div>
        <div className="footer-bottom page-wrap">
          <span>© {new Date().getFullYear()} EduFlow</span>
          <span>Apprendre. Comprendre. Réussir.</span>
        </div>
      </footer>
    </>
  );
}
