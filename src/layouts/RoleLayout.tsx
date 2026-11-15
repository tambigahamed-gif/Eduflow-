import { useState } from 'react';
import { BookOpen, BriefcaseBusiness, GraduationCap, LogOut, Menu, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { useAuth } from '../app/AuthContext';
import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/database';

export type WorkspaceLink = { to: string; label: string; icon: LucideIcon };
const roleHome: Record<AppRole, string> = {
  student: '/dashboard',
  parent: '/parent/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin',
};
const roleLabel: Record<AppRole, string> = {
  student: 'Élève',
  parent: 'Parent',
  teacher: 'Enseignant',
  admin: 'Administration',
};
const roleIcon: Record<AppRole, LucideIcon> = {
  student: BookOpen,
  parent: Users,
  teacher: BriefcaseBusiness,
  admin: ShieldCheck,
};

export function RoleLayout({ role, title, links }: { role: AppRole; title: string; links: WorkspaceLink[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const { profile, user, roles } = useAuth();
  const navigate = useNavigate();
  const Icon = roleIcon[role];

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) { setSignOutError('La déconnexion n’a pas abouti. Réessaie.'); return; }
    navigate('/', { replace: true });
  }

  return <div className="role-app-shell">
    {menuOpen && <button className="role-scrim" type="button" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} />}
    <aside className={`role-sidebar${menuOpen ? ' is-open' : ''}`}>
      <div className="role-brand-row"><Link to={roleHome[role]} onClick={() => setMenuOpen(false)} aria-label="EduFlow, accueil de l’espace"><Brand compact /></Link><button className="role-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer la navigation"><X size={20} /></button></div>
      <div className="role-context"><span><Icon size={17} /></span><div><small>ESPACE</small><strong>{title}</strong></div></div>
      <nav className="role-navigation" aria-label={`Navigation ${roleLabel[role].toLowerCase()}`}>
        {links.map((link) => {
          const LinkIcon = link.icon;
          return <NavLink key={link.to} to={link.to} end={link.to === roleHome[role]} onClick={() => setMenuOpen(false)} className={({ isActive }) => `role-nav-link${isActive ? ' active' : ''}`}><LinkIcon size={18} /><span>{link.label}</span></NavLink>;
        })}
      </nav>
      <div className="role-sidebar-bottom">
        <div className="role-user-row"><span className="role-avatar">{(profile?.first_name?.[0] ?? user?.email?.[0] ?? 'E').toUpperCase()}</span><span className="role-user-text"><strong>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || 'Compte EduFlow'}</strong><small>{roleLabel[role]}</small></span></div>
        {signOutError && <p className="role-error" role="alert">{signOutError}</p>}
        <button className="role-logout" type="button" onClick={() => void signOut()}><LogOut size={16} /> Se déconnecter</button>
      </div>
    </aside>
    <div className="role-main-column">
      <header className="role-topbar">
        <button className="role-menu-toggle" type="button" aria-label="Ouvrir la navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
        <Link to={roleHome[role]} className="role-mobile-brand" aria-label="EduFlow"><Brand compact /></Link>
        <span className="role-topbar-title">{title}</span>
        {roles.length > 1 ? <label className="role-switch-label"><span>Changer d’espace</span><select aria-label="Changer d’espace EduFlow" value={role} onChange={(event) => navigate(roleHome[event.target.value as AppRole])}>
          {(['student', 'parent', 'teacher', 'admin'] as AppRole[]).filter((candidate) => roles.includes(candidate)).map((candidate) => <option key={candidate} value={candidate}>{roleLabel[candidate]}</option>)}
        </select></label> : <Link className="role-request-link" to="/access-request">Demander un autre espace</Link>}
      </header>
      <div className="role-page-content"><Outlet /></div>
    </div>
  </div>;
}

export function ParentLayout() {
  return <RoleLayout role="parent" title="Espace famille" links={[
    { to: '/parent/dashboard', label: 'Tableau de bord', icon: GraduationCap },
    { to: '/parent/children', label: 'Enfants et liens', icon: Users },
    { to: '/parent/progress', label: 'Progrès et objectifs', icon: BookOpen },
    { to: '/parent/results', label: 'Résultats EduFlow', icon: GraduationCap },
    { to: '/parent/notifications', label: 'Notifications', icon: ShieldCheck },
    { to: '/parent/profile', label: 'Mon profil', icon: Users },
  ]} />;
}

export function TeacherLayout() {
  return <RoleLayout role="teacher" title="Espace enseignant" links={[
    { to: '/teacher/dashboard', label: 'Tableau de bord', icon: GraduationCap },
    { to: '/teacher/profile', label: 'Mon profil', icon: Users },
    { to: '/teacher/contributions', label: 'Mes contributions', icon: BookOpen },
    { to: '/teacher/courses', label: 'Mes cours proposés', icon: GraduationCap },
    { to: '/teacher/resources', label: 'Mes ressources', icon: BriefcaseBusiness },
    { to: '/teacher/statistics', label: 'Statistiques', icon: ShieldCheck },
  ]} />;
}

export function AdminLayout() {
  return <RoleLayout role="admin" title="Administration" links={[
    { to: '/admin', label: 'Vue d’ensemble', icon: GraduationCap },
    { to: '/admin/users', label: 'Utilisateurs', icon: Users },
    { to: '/admin/students', label: 'Élèves', icon: BookOpen },
    { to: '/admin/parents', label: 'Parents', icon: Users },
    { to: '/admin/teachers', label: 'Enseignants et demandes', icon: BriefcaseBusiness },
    { to: '/admin/contributions', label: 'Contributions', icon: ShieldCheck },
    { to: '/admin/notifications', label: 'Notifications', icon: ShieldCheck },
    { to: '/admin/audit', label: 'Journal d’audit', icon: ShieldCheck },
  ]} />;
}

export function StudentRoleLinks() {
  const { roles } = useAuth();
  const labels: Partial<Record<AppRole, string>> = { parent: 'Espace parent', teacher: 'Espace enseignant', admin: 'Administration' };
  return <>
    {(['parent', 'teacher', 'admin'] as AppRole[]).filter((role) => roles.includes(role)).map((role) => {
      const Icon = roleIcon[role];
      return <Link key={role} className="role-shortcut" to={roleHome[role]}><Icon size={16} /> {labels[role]}</Link>;
    })}
  </>;
}
