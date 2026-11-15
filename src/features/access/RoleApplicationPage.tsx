import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, GraduationCap, Send, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { ConfigNotice } from '../../components/ConfigNotice';
import { supabase } from '../../lib/supabase';
import type { Database, RequestedRole } from '../../types/database';

type Application = Database['public']['Tables']['role_applications']['Row'];
const labels = { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée' } as const;

export function RoleApplicationPage() {
  const { user, roles } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<RequestedRole>('parent');
  const [presentation, setPresentation] = useState('');
  const [subjects, setSubjects] = useState('');
  const [levels, setLevels] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!user || !supabase) { setApplications([]); setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('role_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (queryError) { setError('Les demandes ne peuvent pas être chargées. Vérifie l’application de la migration Phase 2.'); setApplications([]); }
    else setApplications(data ?? []);
    setLoading(false);
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (role === 'teacher' && !presentation.trim()) { setMessage('Ajoute une présentation avant de demander l’accès enseignant.'); return; }
    setBusy(true); setMessage('');
    const { error: submitError } = await supabase.rpc('phase2_apply_for_role', {
      p_role: role,
      p_presentation: role === 'teacher' ? presentation.trim() : null,
      p_subjects: role === 'teacher' ? subjects.split(',').map((item) => item.trim()).filter(Boolean) : [],
      p_levels: role === 'teacher' ? levels.split(',').map((item) => item.trim()).filter(Boolean) : [],
    });
    setBusy(false);
    if (submitError) setMessage(submitError.message.includes('already') ? 'Une demande existe déjà ou ce rôle est déjà attribué à ce compte.' : 'La demande n’a pas pu être envoyée. Réessaie plus tard.');
    else { setMessage('Demande envoyée. Le rôle ne sera activé qu’après examen administratif.'); setPresentation(''); setSubjects(''); setLevels(''); await refresh(); }
  }

  if (!supabase) return <ConfigNotice fullPage />;
  const available: RequestedRole[] = (['parent', 'teacher'] as RequestedRole[]).filter((candidate) => !roles.includes(candidate));

  return <main className="role-request-page">
    <Link to={roles.includes('student') ? '/dashboard' : '/'} className="role-back"><ArrowLeft size={16} /> Retour à mon espace</Link>
    <header className="role-request-heading"><span className="role-request-icon"><Users size={21} /></span><p className="eyebrow">Espaces EduFlow</p><h1>Demander un autre espace</h1><p>Les accès parent et enseignant sont examinés avant activation. Cette demande ne modifie pas tes rôles.</p></header>
    {roles.includes('admin') && <div className="phase2-notice phase2-notice-info"><CheckCircle2 size={18} /> Ce compte dispose déjà d’un accès administrateur. Aucun rôle admin ne peut être demandé depuis un formulaire public.</div>}
    {available.length > 0 ? <form className="role-request-form" onSubmit={(event) => void submit(event)}>
      <label className="phase2-field">Espace demandé<select value={role} onChange={(event) => setRole(event.target.value as RequestedRole)}>{available.map((candidate) => <option key={candidate} value={candidate}>{candidate === 'parent' ? 'Parent' : 'Enseignant'}</option>)}</select></label>
      {role === 'teacher' && <>
        <label className="phase2-field">Présentation professionnelle<textarea value={presentation} onChange={(event) => setPresentation(event.target.value)} required maxLength={2000} rows={5} placeholder="Décris brièvement ton expérience d’enseignement." /></label>
        <label className="phase2-field">Matières enseignées (séparées par des virgules)<input value={subjects} onChange={(event) => setSubjects(event.target.value)} maxLength={1000} placeholder="Mathématiques, sciences…" /></label>
        <label className="phase2-field">Niveaux concernés (séparés par des virgules)<input value={levels} onChange={(event) => setLevels(event.target.value)} maxLength={1000} placeholder="Collège, lycée…" /></label>
      </>}
      {role === 'parent' && <div className="phase2-notice phase2-notice-info"><Users size={18} /> L’approbation de l’accès parent ne lie aucun enfant. Chaque liaison nécessite ensuite un code unique et la confirmation du compte élève.</div>}
      {message && <p className="phase2-notice" role="status">{message}</p>}
      <button className="phase2-button" type="submit" disabled={busy}>{busy ? <Clock3 size={17} /> : <Send size={17} />}{busy ? 'Envoi…' : 'Envoyer la demande'}</button>
    </form> : <p className="phase2-empty">Tous les rôles parent/enseignant disponibles sont déjà attribués à ce compte.</p>}
    <section className="phase2-card role-application-history"><h2>Mes demandes</h2>{loading ? <p className="phase2-state">Chargement des demandes…</p> : error ? <p role="alert" className="phase2-alert phase2-alert-error">{error}</p> : !applications.length ? <p className="phase2-empty">Aucune demande enregistrée.</p> : <ul className="phase2-list">{applications.map((application) => <li key={application.id}><strong>{application.requested_role === 'parent' ? <><Users size={16} /> Parent</> : <><BriefcaseBusiness size={16} /> Enseignant</>} · {labels[application.status]}</strong><span>Créée le {new Date(application.created_at).toLocaleDateString('fr-FR')}{application.review_note ? ` · Note : ${application.review_note}` : ''}</span></li>)}</ul>}</section>
    <p className="role-application-footnote"><GraduationCap size={16} /> Un administrateur EduFlow examine les demandes. Aucune inscription publique ne peut attribuer le rôle admin.</p>
  </main>;
}
