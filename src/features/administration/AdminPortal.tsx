import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '../../lib/supabase';
import type { AdminSummary, AdminUser, ContentReviewStatus, Database } from '../../types/database';
import type { Json } from '../../types/database';

type Application = Database['public']['Tables']['role_applications']['Row'];
type Teacher = Database['public']['Tables']['teacher_profiles']['Row'];
type Submission = Database['public']['Tables']['content_submissions']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];
type AuditLog = Database['public']['Tables']['admin_audit_logs']['Row'];

const PAGE_SIZE = 25;
const dateText = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';
const displayName = (u: AdminUser) => `${u.first_name} ${u.last_name}`.trim() || u.email || u.user_id;

function useAdminAccess() {
  const { user, role, loading, accountLoading } = useAuth();
  return { allowed: !!user && role === 'admin', loading: loading || accountLoading, configured: !!supabase };
}

function Notice({ error, retry }: { error: string; retry?: () => void }) {
  return <div className="phase2-alert" role="alert"><AlertCircle size={18} aria-hidden="true"/><span>{error}</span>{retry && <button type="button" onClick={retry} aria-label="Réessayer"><RefreshCw size={16}/></button>}</div>;
}
function Busy() { return <div className="phase2-state" role="status"><LoaderCircle className="phase2-spin" size={22}/> Chargement…</div>; }
function Empty({ children = 'Aucun résultat.' }: { children?: ReactNode }) { return <div className="phase2-state">{children}</div>; }
function AdminFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const access = useAdminAccess();
  if (access.loading) return <main className="phase2-admin"><Busy/></main>;
  if (!access.configured) return <main className="phase2-admin"><Notice error="Le client Supabase n’est pas configuré. Aucun privilège d’administration n’est disponible."/></main>;
  if (!access.allowed) return <main className="phase2-admin"><Notice error="Accès administrateur indisponible : une session authentifiée avec le rôle admin est requise. Cette interface ne permet pas de devenir administrateur."/></main>;
  return <main className="phase2-admin"><header className="phase2-page-head"><div><p className="phase2-eyebrow">Administration</p><h1>{title}</h1><p>{description}</p></div></header>{children}</main>;
}
function useLoad<T>(loader: () => Promise<T>, queryKey: string) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const loaderRef = useRef(loader);
  const requestId = useRef(0);
  useEffect(() => { loaderRef.current = loader; }, [loader]);
  const run = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError('');
    try { const result = await loaderRef.current(); if (currentRequest === requestId.current) setData(result); }
    catch (cause) { if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'Impossible de charger les données.'); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void run(); }, 0);
    return () => { window.clearTimeout(timer); requestId.current += 1; };
  }, [queryKey, run]);
  return { data, loading, error, reload: run };
}
function rpcError(error: { message: string } | null) { if (error) throw new Error(error.message); }
function TableWrap({ children }: { children: ReactNode }) { return <div className="phase2-table-wrap"><table className="phase2-table">{children}</table></div>; }

export function AdminDashboard() {
  const state = useLoad(async () => { const { data, error } = await supabase!.rpc('phase2_admin_summary', {}); rpcError(error); return data as AdminSummary; }, 'admin-summary');
  return <AdminFrame title="Vue d’ensemble" description="Indicateurs réels de la plateforme.">{state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : !state.data ? <Empty/> : <section className="phase2-stat-grid" aria-label="Indicateurs">
    {[['Élèves', state.data.students], ['Parents', state.data.parents], ['Enseignants', state.data.teachers], ['Candidatures en attente', state.data.pending_role_applications], ['Contributions en attente', state.data.pending_contributions], ['Notifications non lues', state.data.unread_notifications]].map(([label, value]) => <article className="phase2-stat-card" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}
  </section>}</AdminFrame>;
}
function UserList({ roleFilter }: { roleFilter?: 'student' | 'parent' }) {
  const [query, setQuery] = useState(''); const [committed, setCommitted] = useState(''); const [offset, setOffset] = useState(0); const [busyId, setBusyId] = useState(''); const [actionError, setActionError] = useState('');
  const state = useLoad(async () => { const { data, error } = await supabase!.rpc('phase2_admin_list_users', { p_query: committed || null, p_limit: PAGE_SIZE, p_offset: offset, p_role: roleFilter ?? null }); rpcError(error); return (data ?? []) as AdminUser[]; }, `users:${roleFilter ?? 'all'}:${offset}:${committed}`);
  const users = state.data ?? [];
  async function changeRole(u: AdminUser, role: 'parent' | 'teacher', grant: boolean) { setBusyId(u.user_id); setActionError(''); try { const { error } = await supabase!.rpc('phase2_admin_set_role', { p_user_id: u.user_id, p_role: role, p_grant: grant, p_note: null }); rpcError(error); await state.reload(); } catch (e) { setActionError(e instanceof Error ? e.message : 'Modification refusée.'); } finally { setBusyId(''); } }
  return <AdminFrame title={roleFilter === 'student' ? 'Élèves' : roleFilter === 'parent' ? 'Parents' : 'Utilisateurs'} description="Recherche et gestion des rôles autorisés. Les adresses sont fournies par le RPC serveur, sans lecture de auth.users.">
    <form className="phase2-toolbar" onSubmit={e => { e.preventDefault(); setOffset(0); setCommitted(query.trim()); }}><label className="phase2-search"><Search size={17}/><span className="phase2-sr-only">Rechercher nom ou e-mail</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou e-mail"/></label><button className="phase2-button" type="submit">Rechercher</button></form>
    {actionError && <Notice error={actionError}/>} {state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : users.length === 0 ? <Empty/> : <TableWrap><thead><tr><th>Utilisateur</th><th>Rôles</th><th>Créé le</th><th>Actions parent/enseignant</th></tr></thead><tbody>{users.map(u => <tr key={u.user_id}><td><strong>{displayName(u)}</strong><small>{u.email ?? 'E-mail indisponible'}</small></td><td>{u.roles.join(', ') || '—'}</td><td>{dateText(u.created_at)}</td><td className="phase2-actions">{(['parent', 'teacher'] as const).map(r => <button key={r} className="phase2-button phase2-button-secondary" disabled={!!busyId || (r === 'parent' && !u.roles.includes(r) && !roleFilter)} onClick={() => void changeRole(u, r, !u.roles.includes(r))}>{busyId === u.user_id ? '…' : `${u.roles.includes(r) ? 'Révoquer' : 'Accorder'} ${r}`}</button>)}</td></tr>)}</tbody></TableWrap>}
    <nav className="phase2-pagination" aria-label="Pagination"><button className="phase2-button phase2-button-secondary" disabled={offset === 0 || state.loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={16}/> Précédent</button><span>Page {Math.floor(offset / PAGE_SIZE) + 1}</span><button className="phase2-button phase2-button-secondary" disabled={state.loading || (state.data?.length ?? 0) < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)}>Suivant <ChevronRight size={16}/></button></nav>
  </AdminFrame>;
}
export function AdminUsersPage() { return <UserList/>; }
export function AdminStudentsPage() { return <UserList roleFilter="student"/>; }
function ParentRoleApplications() {
  const state = useLoad(async () => { const { data, error } = await supabase!.from('role_applications').select('*').eq('requested_role', 'parent').eq('status', 'pending').order('created_at', { ascending: false }); rpcError(error); return (data ?? []) as Application[]; }, 'parent-role-applications');
  const [notes, setNotes] = useState<Record<string, string>>({}); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  async function review(id: string, approve: boolean) { setBusy(id); setError(''); try { const { error: result } = await supabase!.rpc('phase2_review_role_application', { p_application_id: id, p_approve: approve, p_note: notes[id] || null }); rpcError(result); await state.reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'La décision a échoué.'); } finally { setBusy(''); } }
  return <AdminFrame title="Demandes d’accès parent" description="L’accès parent exige une décision administrative. Une approbation n’associe aucun enfant.">{error && <Notice error={error}/ >}{state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : !state.data?.length ? <Empty>Aucune demande parent en attente.</Empty> : <TableWrap><thead><tr><th>Demandeur</th><th>Présentation</th><th>Reçue le</th><th>Décision</th></tr></thead><tbody>{state.data.map((application) => <tr key={application.id}><td>{application.user_id}</td><td>{application.presentation || '—'}</td><td>{dateText(application.created_at)}</td><td><input aria-label={`Note pour ${application.user_id}`} value={notes[application.id] ?? ''} onChange={(event) => setNotes({ ...notes, [application.id]: event.target.value })}/><button className="phase2-button" disabled={!!busy} onClick={() => void review(application.id, true)}>{busy === application.id ? '…' : 'Approuver'}</button><button className="phase2-button phase2-button-secondary" disabled={!!busy} onClick={() => void review(application.id, false)}>Refuser</button></td></tr>)}</tbody></TableWrap>}</AdminFrame>;
}
export function AdminParentsPage() { return <><ParentRoleApplications/><UserList roleFilter="parent"/></>; }

export function AdminTeachersPage() {
  const state = useLoad(async () => { const [a, t] = await Promise.all([supabase!.from('role_applications').select('*').eq('requested_role', 'teacher').eq('status', 'pending').order('created_at', { ascending: false }), supabase!.from('teacher_profiles').select('*').order('created_at', { ascending: false })]); rpcError(a.error); rpcError(t.error); return { applications: (a.data ?? []) as Application[], teachers: (t.data ?? []) as Teacher[] }; }, 'teacher-applications-and-profiles');
  const [note, setNote] = useState<Record<string, string>>({}); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  async function review(id: string, approve: boolean) { setBusy(id); setError(''); try { const { error: e } = await supabase!.rpc('phase2_review_role_application', { p_application_id: id, p_approve: approve, p_note: note[id] || null }); rpcError(e); await state.reload(); } catch (e) { setError(e instanceof Error ? e.message : 'La décision a échoué.'); } finally { setBusy(''); } }
  return <AdminFrame title="Enseignants" description="Profils et candidatures réels. L’attribution du rôle passe par l’approbation serveur.">{error && <Notice error={error}/ >}{state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : !state.data || (!state.data.applications.length && !state.data.teachers.length) ? <Empty/> : <><h2>Candidatures en attente</h2>{state.data.applications.length ? <TableWrap><thead><tr><th>Candidature</th><th>Présentation</th><th>Disciplines / niveaux</th><th>Décision</th></tr></thead><tbody>{state.data.applications.map(a => <tr key={a.id}><td>{a.user_id}<small>{dateText(a.created_at)}</small></td><td>{a.presentation || '—'}</td><td>{[...a.subjects, ...a.levels].join(', ') || '—'}</td><td><input aria-label="Note de décision" value={note[a.id] ?? ''} onChange={e => setNote({ ...note, [a.id]: e.target.value })}/><button className="phase2-button" disabled={!!busy} onClick={() => void review(a.id, true)}>Accepter</button><button className="phase2-button phase2-button-secondary" disabled={!!busy} onClick={() => void review(a.id, false)}>Refuser</button></td></tr>)}</tbody></TableWrap> : <Empty>Aucune candidature en attente.</Empty>}<h2>Profils enseignants</h2>{state.data.teachers.length ? <TableWrap><thead><tr><th>Utilisateur</th><th>Présentation</th><th>Disciplines</th><th>Niveaux</th><th>État</th></tr></thead><tbody>{state.data.teachers.map(t => <tr key={t.user_id}><td>{t.user_id}</td><td>{t.presentation}</td><td>{t.subjects.join(', ')}</td><td>{t.levels.join(', ')}</td><td>{t.is_active ? 'Actif' : 'Inactif'}</td></tr>)}</tbody></TableWrap> : <Empty>Aucun profil enseignant.</Empty>}</>}</AdminFrame>;
}

function jsonText(value: Json) { try { return JSON.stringify(value, null, 2); } catch { return String(value); } }
type SubmissionAsset = { path: string; name: string; mime: string; size: number };
function isSubmissionAsset(value: Json): value is SubmissionAsset {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return typeof value['path'] === 'string' && typeof value['name'] === 'string'
    && typeof value['mime'] === 'string' && typeof value['size'] === 'number';
}
function submissionAssets(value: Json): SubmissionAsset[] {
  return Array.isArray(value) ? value.filter(isSubmissionAsset) : [];
}
function reviewStatusLabel(status: Submission['status']) {
  return ({ draft: 'Brouillon', submitted: 'Soumis', in_review: 'En examen', approved: 'Approuvé', rejected: 'Refusé' } as const)[status];
}
export function AdminContributionsPage() {
  const state = useLoad(async () => { const { data, error } = await supabase!.from('content_submissions').select('*').order('updated_at', { ascending: false }).limit(100); rpcError(error); return (data ?? []) as Submission[]; }, 'content-submissions');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [fileBusy, setFileBusy] = useState('');
  const [signedFiles, setSignedFiles] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState('');

  async function review(submission: Submission, status: ContentReviewStatus) {
    setBusy(submission.id); setError('');
    try {
      const { error: result } = await supabase!.rpc('phase2_review_content', { p_submission_id: submission.id, p_next_status: status, p_note: notes[submission.id] || null });
      rpcError(result); setSelected(null); await state.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'La revue a échoué.'); }
    finally { setBusy(''); }
  }
  async function createSignedFile(asset: SubmissionAsset) {
    if (!supabase) return;
    setFileBusy(asset.path); setFileError('');
    try {
      const { data, error: storageError } = await supabase.storage.from('eduflow-teacher-contributions').createSignedUrl(asset.path, 60);
      if (storageError) throw storageError;
      setSignedFiles((current) => ({ ...current, [asset.path]: data.signedUrl }));
    } catch { setFileError('Le fichier privé ne peut pas être ouvert; vérifie les droits Storage et la configuration du bucket.'); }
    finally { setFileBusy(''); }
  }
  const selectedAssets = selected ? submissionAssets(selected.assets) : [];

  return <AdminFrame title="Contributions" description="Examiner les soumissions. Une revue ne publie aucun contenu par simple affichage.">
    {error && <Notice error={error}/ >}
    {state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : !state.data?.length ? <Empty>Aucune contribution.</Empty> : <TableWrap><thead><tr><th>Titre / type</th><th>Enseignant</th><th>État</th><th>Soumise le</th><th>Actions</th></tr></thead><tbody>{state.data.map((submission) => <tr key={submission.id}>
      <td><strong>{submission.title}</strong><small>{submission.content_type} · {(submission.subjects ?? []).join(', ')}</small></td>
      <td>{submission.teacher_user_id}</td><td>{reviewStatusLabel(submission.status)}</td><td>{dateText(submission.submitted_at)}</td>
      <td className="phase2-actions"><button className="phase2-button phase2-button-secondary" onClick={() => { setSelected(submission); setFileError(''); }}>Détails / fichiers</button>
        {submission.status === 'submitted' && <button className="phase2-button" disabled={!!busy} onClick={() => void review(submission, 'in_review')}>Démarrer examen</button>}
        {submission.status === 'in_review' && <><button className="phase2-button" disabled={!!busy} onClick={() => void review(submission, 'approved')}>Approuver</button><button className="phase2-button phase2-button-secondary" disabled={!!busy} onClick={() => void review(submission, 'rejected')}>Refuser</button><input aria-label="Note de revue" value={notes[submission.id] ?? ''} onChange={(event) => setNotes({ ...notes, [submission.id]: event.target.value })}/></>}
      </td>
    </tr>)}</tbody></TableWrap>}
    {selected && <div className="phase2-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="phase2-modal" role="dialog" aria-modal="true" aria-labelledby="phase2-detail-title" onClick={(event) => event.stopPropagation()}>
      <button className="phase2-icon-button" aria-label="Fermer" onClick={() => setSelected(null)}><X size={18}/></button>
      <p className="phase2-eyebrow">{reviewStatusLabel(selected.status)}</p><h2 id="phase2-detail-title">{selected.title}</h2><p>{selected.description || 'Aucune description.'}</p>
      <h3>Fichiers privés</h3>
      {!selectedAssets.length ? <p>Aucun fichier associé à cette soumission.</p> : <ul className="phase2-private-files">{selectedAssets.map((asset) => <li key={asset.path}><span><strong>{asset.name}</strong><small>{asset.mime} · {(asset.size / 1024 / 1024).toFixed(1)} MiB</small></span>{signedFiles[asset.path] ? <a href={signedFiles[asset.path]} target="_blank" rel="noreferrer">Ouvrir le fichier (lien temporaire)</a> : <button className="phase2-button phase2-button-secondary" type="button" disabled={fileBusy === asset.path} onClick={() => void createSignedFile(asset)}>{fileBusy === asset.path ? 'Création…' : 'Créer un lien privé · 60 s'}</button>}</li>)}</ul>}
      {fileError && <Notice error={fileError}/>}
      <h3>Métadonnées</h3><pre className="phase2-json">{jsonText(selected.metadata)}</pre>
      <p>Les fichiers ne sont accessibles qu’avec un lien signé de courte durée après vérification Storage; aucun fichier n’est rendu public par l’approbation.</p>
    </section></div>}
  </AdminFrame>;
}
export function AdminNotificationsPage() {
  const [userId, setUserId] = useState(''); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [message, setMessage] = useState(''); const [sending, setSending] = useState(false);
  const state = useLoad(async () => { const { data, error } = await supabase!.from('notifications').select('*').order('created_at', { ascending: false }).limit(100); rpcError(error); return (data ?? []) as Notification[]; }, 'admin-notifications');
  async function send(e: React.FormEvent) { e.preventDefault(); setSending(true); setMessage(''); try { const { error } = await supabase!.rpc('phase2_admin_send_notification', { p_user_id: userId.trim(), p_title: title.trim(), p_body: body.trim() }); rpcError(error); setMessage('Notification envoyée.'); setUserId(''); setTitle(''); setBody(''); await state.reload(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Envoi impossible.'); } finally { setSending(false); } }
  return <AdminFrame title="Notifications" description="Composer un message pour un destinataire explicitement identifié et consulter la boîte de gestion admin."><form className="phase2-form" onSubmit={e => void send(e)}><h2>Nouvelle notification</h2><label>ID utilisateur du destinataire<input required value={userId} onChange={e => setUserId(e.target.value)} autoComplete="off"/></label><label>Titre<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)}/></label><label>Message<textarea required rows={4} value={body} onChange={e => setBody(e.target.value)}/></label><button className="phase2-button" disabled={sending}>{sending ? 'Envoi…' : 'Envoyer'}</button>{message && <p role="status">{message}</p>}</form><h2>Notifications récentes</h2>{state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : !state.data?.length ? <Empty/> : <TableWrap><thead><tr><th>Destinataire</th><th>Notification</th><th>Type</th><th>Date</th><th>Lecture</th></tr></thead><tbody>{state.data.map(n => <tr key={n.id}><td>{n.user_id}</td><td><strong>{n.title}</strong><small>{n.body}</small></td><td>{n.notification_type}</td><td>{dateText(n.created_at)}</td><td>{n.read_at ? 'Lue' : 'Non lue'}</td></tr>)}</tbody></TableWrap>}</AdminFrame>;
}
export function AdminAuditPage() {
  const state = useLoad(async () => { const { data, error } = await supabase!.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100); rpcError(error); return (data ?? []) as AuditLog[]; }, 'admin-audit');
  return <AdminFrame title="Journal d’audit" description="Événements récents en lecture seule. Les journaux sont append-only.">{state.loading ? <Busy/> : state.error ? <Notice error={state.error} retry={state.reload}/> : !state.data?.length ? <Empty>Aucun événement récent.</Empty> : <TableWrap><thead><tr><th>Date</th><th>Administrateur</th><th>Action</th><th>Entité</th><th>Cible</th><th>Métadonnées</th></tr></thead><tbody>{state.data.map(l => <tr key={l.id}><td>{dateText(l.created_at)}</td><td>{l.admin_user_id}</td><td>{l.action}</td><td>{l.entity_type}{l.entity_id ? ` · ${l.entity_id}` : ''}</td><td>{l.target_user_id ?? '—'}</td><td><code>{jsonText(l.metadata)}</code></td></tr>)}</tbody></TableWrap>}</AdminFrame>;
}
