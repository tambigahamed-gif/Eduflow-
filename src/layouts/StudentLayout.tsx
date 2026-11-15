import { useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Link2, LogOut, Menu, X } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { useAuth } from '../app/AuthContext';
import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/database';

const roleHome: Record<AppRole, string> = { student: '/dashboard', parent: '/parent/dashboard', teacher: '/teacher/dashboard', admin: '/admin' };
const roleLabel: Record<AppRole, string> = { student: 'Élève', parent: 'Parent', teacher: 'Enseignant', admin: 'Administration' };

export function StudentLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const { profile, roles } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSignOutError('La déconnexion n’a pas abouti. Réessaie.');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="student-app-shell">
      <aside className={`student-sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand-row">
          <Brand compact />
          <button className="sidebar-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer la navigation"><X size={20} /></button>
        </div>
        <div className="sidebar-context"><span className="sidebar-context-icon"><GraduationCap size={17} /></span><span>Mon espace étudiant</span></div>
        <nav className="sidebar-nav" aria-label="Navigation étudiant">
          <span className="sidebar-label">APPRENDRE</span>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
            <BookOpen size={18} /> Mon tableau de bord
          </NavLink>
          <div className="sidebar-coming" aria-label="Les autres modules seront disponibles ultérieurement">
            <span className="coming-link"><GraduationCap size={18} /> Cours et matières</span>
            <span className="coming-pill">À venir</span>
          </div>
          <span className="sidebar-label">FAMILLE</span>
          <NavLink to="/student/parent-links" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
            <Link2 size={18} /> Liaisons parentales
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-support-card">
            <span className="support-spark">✦</span>
            <strong>Chaque progrès compte.</strong>
            <p>Les nouveaux outils d’apprentissage arriveront étape par étape.</p>
          </div>
          <div className="sidebar-user">
            <span className="avatar-initials">{(profile?.first_name?.[0] ?? 'E').toUpperCase()}</span>
            <span className="sidebar-user-name">{profile?.first_name || 'Élève'}<small>Espace étudiant</small></span>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
          {signOutError && <p className="inline-error" role="alert">{signOutError}</p>}
          <button className="sidebar-logout" type="button" onClick={() => void handleSignOut()}><LogOut size={16} /> Se déconnecter</button>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />}
      <div className="student-main-column">
        <header className="student-topbar">
          <button className="student-menu-toggle" type="button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir la navigation"><Menu size={21} /></button>
          <Link className="student-mobile-brand" to="/dashboard"><Brand compact /></Link>
          <span className="topbar-context">Mon espace d’apprentissage</span>
          {roles.length > 1 && <label className="student-role-switch"><span className="sr-only">Changer d’espace EduFlow</span><select aria-label="Changer d’espace EduFlow" value="student" onChange={(event) => navigate(roleHome[event.target.value as AppRole])}>{(['student', 'parent', 'teacher', 'admin'] as AppRole[]).filter((role) => roles.includes(role)).map((role) => <option key={role} value={role}>{roleLabel[role]}</option>)}</select></label>}
          <Link className="topbar-avatar" to="/dashboard" aria-label={`Compte de ${profile?.first_name || 'l’élève'}`}>
            {(profile?.first_name?.[0] ?? 'E').toUpperCase()}
          </Link>
        </header>
        <main className="student-content"><Outlet /></main>
      </div>
    </div>
  );
}
