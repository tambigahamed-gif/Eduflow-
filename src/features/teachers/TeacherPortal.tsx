import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, Pencil, Plus, Save, Send, Video, XCircle } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ContentStatus, ContentType, Database, Json } from '../../types/database';

type Submission = Database['public']['Tables']['content_submissions']['Row'];
type Review = Database['public']['Tables']['content_reviews']['Row'];
type TeacherProfile = { user_id: string; presentation: string; subjects: string[]; levels: string[]; is_active: boolean; verified_by: string | null; verified_at: string | null; created_at: string; updated_at: string };
type Asset = { path: string; name: string; mime: string; size: number };
const statusLabels: Record<ContentStatus, string> = { draft: 'Brouillon', submitted: 'Soumis', in_review: 'En examen', approved: 'Approuvé', rejected: 'Refusé' };
const typeLabels: Record<ContentType, string> = { course: 'Cours (proposition)', resource: 'Ressource', exercise: 'Exercice (proposition éditoriale)' };
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function splitTags(value: string) { return [...new Set(value.split(',').map((part) => part.trim()).filter(Boolean))]; }
function formatDate(value: string) { return new Date(value).toLocaleDateString('fr-FR', { dateStyle: 'medium' }); }
function ErrorMessage({ children }: { children: ReactNode }) { return <div className="phase2-alert phase2-alert-error" role="alert"><AlertCircle size={18} aria-hidden="true" />{children}</div>; }
function Loading() { return <p className="phase2-loading" role="status"><Loader2 className="phase2-spin" size={18} /> Chargement de vos données…</p>; }
function Page({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) { return <main className="phase2-page"><header className="phase2-page-header"><h1>{title}</h1>{intro && <p>{intro}</p>}</header>{children}</main>; }
function StatusBadge({ status }: { status: ContentStatus }) { return <span className={`phase2-status phase2-status-${status}`}>{statusLabels[status]}</span>; }
function Empty({ children }: { children: ReactNode }) { return <div className="phase2-empty"><FileText size={24} aria-hidden="true" /><p>{children}</p></div>; }

function useTeacherData() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré dans cet environnement.'); return; }
    if (!user) { setLoading(false); setError('Connectez-vous pour consulter votre espace enseignant.'); return; }
    setLoading(true); setError('');
    try {
      const [subResult, profileResult] = await Promise.all([
        supabase.from('content_submissions').select('*').eq('teacher_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('teacher_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      if (subResult.error) throw subResult.error;
      if (profileResult.error) throw profileResult.error;
      const ownedSubmissions = subResult.data ?? [];
      let ownedReviews: Review[] = [];
      if (ownedSubmissions.length) {
        const reviewResult = await supabase.from('content_reviews').select('*').in('submission_id', ownedSubmissions.map((item) => item.id)).order('created_at', { ascending: false });
        if (reviewResult.error) throw reviewResult.error;
        ownedReviews = reviewResult.data ?? [];
      }
      setSubmissions(ownedSubmissions); setReviews(ownedReviews); setProfile(profileResult.data);
    } catch (e) { setError(`Impossible de charger vos informations : ${e instanceof Error ? e.message : 'erreur Supabase inconnue'}`); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  return { user, submissions, reviews, profile, loading, error, refresh, setProfile };
}

function PrivateAssetLink({ asset }: { asset: Asset }) {
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function createLink() {
    if (!supabase) return;
    setBusy(true); setError('');
    try { const { data, error: storageError } = await supabase.storage.from('eduflow-teacher-contributions').createSignedUrl(asset.path, 60); if (storageError) throw storageError; setUrl(data.signedUrl); }
    catch { setError('Fichier privé indisponible. Vérifiez l’accès Storage.'); }
    finally { setBusy(false); }
  }
  return <li><span>{asset.name} ({(asset.size / 1024 / 1024).toFixed(1)} MiB)</span>{url ? <a href={url} target="_blank" rel="noreferrer">Ouvrir · lien temporaire <ExternalLink size={13}/></a> : <button className="phase2-link-button" type="button" onClick={() => void createLink()} disabled={busy}>{busy ? 'Création…' : 'Créer un lien privé · 60 s'}</button>}{error && <small role="alert">{error}</small>}</li>;
}
function SubmissionCard({ item, reviews = [] }: { item: Submission; reviews?: Review[] }) {
  const [expanded, setExpanded] = useState(false);
  const assets: Asset[] = Array.isArray(item.assets) ? item.assets.filter((a): a is Asset => Boolean(a && typeof a === 'object' && 'path' in a && 'name' in a && 'mime' in a && 'size' in a)) : [];
  const itemReviews = reviews.filter((review) => review.submission_id === item.id);
  return <article className="phase2-submission-card"><div className="phase2-card-top"><div><p className="phase2-eyebrow">{typeLabels[item.content_type]}</p><h3>{item.title}</h3></div><StatusBadge status={item.status} /></div><p className="phase2-muted">Créé le {formatDate(item.created_at)}{item.submitted_at ? ` · Soumis le ${formatDate(item.submitted_at)}` : ''}</p>
    <button className="phase2-link-button" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Masquer les détails' : 'Voir les détails'} <ArrowRight size={16} /></button>
    {expanded && <div className="phase2-details"><p>{item.description || 'Aucune description.'}</p><p><strong>Matières :</strong> {item.subjects.length ? item.subjects.join(', ') : 'Non renseignées'}</p><p><strong>Niveaux :</strong> {item.levels.length ? item.levels.join(', ') : 'Non renseignés'}</p>{assets.length > 0 && <div><strong>Fichiers associés (stockage privé)</strong><ul className="phase2-private-files">{assets.map((asset) => <PrivateAssetLink key={asset.path} asset={asset}/>)}</ul></div>}{itemReviews.length > 0 && <div className="phase2-review-notes"><strong>Retours de l’équipe de revue</strong>{itemReviews.map((review) => <p key={review.id}><span>{statusLabels[review.status]} · {formatDate(review.created_at)}</span>{review.note || 'Aucun commentaire supplémentaire.'}</p>)}</div>}{item.status === 'approved' && <p className="phase2-notice">Approuvé par l’équipe de revue. Cette approbation ne publie pas automatiquement de contenu élève.</p>}</div>}
  </article>;
}
export function TeacherDashboard() {
  const { submissions, reviews, profile, loading, error } = useTeacherData();
  const counts = useMemo(() => submissions.reduce<Record<ContentStatus, number>>((acc, item) => { acc[item.status] += 1; return acc; }, { draft: 0, submitted: 0, in_review: 0, approved: 0, rejected: 0 }), [submissions]);
  return <Page title="Espace enseignant" intro="Suivez vos contributions et gérez vos propositions pédagogiques.">{loading ? <Loading /> : error ? <ErrorMessage>{error}</ErrorMessage> : <><section className="phase2-stat-grid" aria-label="Résumé de vos contributions"><div className="phase2-stat"><FileText /><span>Total de vos contributions</span><strong>{submissions.length}</strong></div><div className="phase2-stat"><Clock3 /><span>Soumis / en examen</span><strong>{counts.submitted + counts.in_review}</strong></div><div className="phase2-stat"><CheckCircle2 /><span>Approuvés</span><strong>{counts.approved}</strong></div><div className="phase2-stat"><XCircle /><span>Refusés</span><strong>{counts.rejected}</strong></div></section><section className="phase2-section"><h2>Profil de contribution</h2>{profile ? <p>{profile.is_active ? 'Profil actif' : 'Profil inactif'}{profile.subjects.length ? ` · ${profile.subjects.join(', ')}` : ''}</p> : <p>Aucun profil enseignant trouvé pour ce compte.</p>}</section><section className="phase2-section"><h2>Contributions récentes</h2>{submissions.length ? <div className="phase2-card-list">{submissions.slice(0, 3).map((item) => <SubmissionCard key={item.id} item={item} reviews={reviews} />)}</div> : <Empty>Vous n’avez pas encore de contribution.</Empty>}</section></>}</Page>;
}

export function TeacherProfilePage() {
  const { user } = useAuth(); const { profile, loading, error, setProfile } = useTeacherData();
  const [draft, setDraft] = useState<{ presentation: string; subjects: string; levels: string } | null>(null); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState('');
  const values = draft ?? { presentation: profile?.presentation ?? '', subjects: profile?.subjects.join(', ') ?? '', levels: profile?.levels.join(', ') ?? '' };
  function updateDraft(field: 'presentation' | 'subjects' | 'levels', value: string) { setDraft((current) => ({ ...(current ?? { presentation: profile?.presentation ?? '', subjects: profile?.subjects.join(', ') ?? '', levels: profile?.levels.join(', ') ?? '' }), [field]: value })); }
  async function save(e: FormEvent) { e.preventDefault(); if (!supabase || !user || !profile) return; setSaving(true); setNotice(''); try { const updates = { presentation: values.presentation, subjects: splitTags(values.subjects), levels: splitTags(values.levels) }; const { data, error: saveError } = await supabase.from('teacher_profiles').update(updates).eq('user_id', user.id).select('*').maybeSingle(); if (saveError) throw saveError; if (!data) throw new Error('Aucun profil modifiable trouvé pour ce compte.'); setProfile(data); setDraft(null); setNotice('Profil enregistré.'); } catch (e) { setNotice(`Enregistrement impossible : ${e instanceof Error ? e.message : 'erreur inconnue'}`); } finally { setSaving(false); } }
  return <Page title="Mon profil enseignant" intro="Présentez votre expérience, vos matières et les niveaux concernés.">{loading ? <Loading /> : error ? <ErrorMessage>{error}</ErrorMessage> : !profile ? <Empty>Aucun profil enseignant n’est associé à votre compte. La création et l’attribution du rôle relèvent de l’administration.</Empty> : <form className="phase2-form" onSubmit={save}><label htmlFor="phase2-presentation">Présentation</label><textarea id="phase2-presentation" rows={5} value={values.presentation} onChange={(e) => updateDraft('presentation', e.target.value)} /><label htmlFor="phase2-subjects">Matières (séparées par des virgules)</label><input id="phase2-subjects" value={values.subjects} onChange={(e) => updateDraft('subjects', e.target.value)} placeholder="Ex. mathématiques, histoire" /><label htmlFor="phase2-levels">Niveaux (séparés par des virgules)</label><input id="phase2-levels" value={values.levels} onChange={(e) => updateDraft('levels', e.target.value)} placeholder="Ex. collège, lycée" /><p className="phase2-help">Ces catégories sont libres et configurées par vous.</p>{notice && <p role="status" className="phase2-notice">{notice}</p>}<button className="phase2-button" type="submit" disabled={saving}><Save size={17} />{saving ? 'Enregistrement…' : 'Enregistrer le profil'}</button></form>}</Page>;
}

export function TeacherSubmissionsPage() {
  const data = useTeacherData(); const { user, submissions, reviews, loading, error, refresh } = data;
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [contentType, setContentType] = useState<ContentType>('resource'); const [subjects, setSubjects] = useState(''); const [levels, setLevels] = useState(''); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); const [editTitle, setEditTitle] = useState(''); const [editDescription, setEditDescription] = useState(''); const [editSubjects, setEditSubjects] = useState(''); const [editLevels, setEditLevels] = useState('');
  function chooseFile(e: ChangeEvent<HTMLInputElement>) { const next = e.target.files?.[0] ?? null; setMessage(''); if (!next) { setFile(null); return; } const mimeOk = next.type === 'application/pdf' || next.type === 'video/mp4' || next.type === 'video/webm'; const extensionOk = /\.(pdf|mp4|webm)$/i.test(next.name); if (!mimeOk || !extensionOk) { setFile(null); e.target.value = ''; setMessage('Format refusé : choisissez un PDF, MP4 ou WebM.'); return; } if (next.size > MAX_FILE_SIZE) { setFile(null); e.target.value = ''; setMessage('Fichier trop volumineux : la limite est de 50 MiB.'); return; } setFile(next); }
  async function createDraft(e: FormEvent) { e.preventDefault(); if (!supabase || !user) { setMessage('Connexion Supabase requise pour créer un brouillon.'); return; } if (!title.trim()) { setMessage('Le titre est obligatoire.'); return; } setBusy(true); setMessage(''); let draftId: string | null = null; try {
      const { data: created, error: createError } = await supabase.rpc('phase2_create_content_draft', { p_content_type: contentType, p_title: title.trim(), p_description: description.trim() }); if (createError) throw createError; draftId = created; if (!draftId) throw new Error('La création du brouillon n’a retourné aucun identifiant.');
      const tagUpdate = await supabase.from('content_submissions').update({ subjects: splitTags(subjects), levels: splitTags(levels) }).eq('id', draftId).eq('teacher_user_id', user.id); if (tagUpdate.error) throw tagUpdate.error;
      if (file) {
        const safeFilename = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(-150) || 'contribution'; const path = `${user.id}/${draftId}/${safeFilename}`;
        const { error: uploadError } = await supabase.storage.from('eduflow-teacher-contributions').upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) throw new Error(`Fichier non reçu par le stockage : ${uploadError.message}`);
        const asset: Asset = { path, name: file.name, mime: file.type, size: file.size }; const { error: assetError } = await supabase.from('content_submissions').update({ assets: [asset] as unknown as Json }).eq('id', draftId).eq('teacher_user_id', user.id); if (assetError) { throw new Error(`Fichier téléversé, mais association au brouillon impossible : ${assetError.message}. Le brouillon n’a pas été soumis.`); }
      }
      setMessage('Brouillon créé avec succès. Il n’est pas soumis pour examen.'); setTitle(''); setDescription(''); setSubjects(''); setLevels(''); setFile(null); await refresh();
    } catch (e) { setMessage(`Échec : ${e instanceof Error ? e.message : 'erreur inconnue'}.${draftId ? ' Un brouillon peut avoir été créé; vérifiez la liste avant de recommencer.' : ''}`); await refresh(); } finally { setBusy(false); } }
  function editSubmission(item: Submission) { setEditingId(item.id); setEditTitle(item.title); setEditDescription(item.description); setEditSubjects(item.subjects.join(', ')); setEditLevels(item.levels.join(', ')); setMessage(''); }
  async function saveSubmissionEdit(event: FormEvent) { event.preventDefault(); if (!supabase || !user || !editingId) return; setBusy(true); setMessage(''); try { const { data, error: saveError } = await supabase.from('content_submissions').update({ title: editTitle.trim(), description: editDescription.trim(), subjects: splitTags(editSubjects), levels: splitTags(editLevels) }).eq('id', editingId).eq('teacher_user_id', user.id).in('status', ['draft', 'rejected']).select('id').maybeSingle(); if (saveError) throw saveError; if (!data) throw new Error('Cette contribution n’est plus modifiable.'); setMessage('Brouillon mis à jour.'); setEditingId(null); await refresh(); } catch (cause) { setMessage(`Modification impossible : ${cause instanceof Error ? cause.message : 'erreur inconnue'}`); } finally { setBusy(false); } }
  async function submitDraft(id: string) { if (!supabase) return; setBusy(true); setMessage(''); try { const { error: submitError } = await supabase.rpc('phase2_submit_content', { p_submission_id: id }); if (submitError) throw submitError; setMessage('Contribution transmise pour examen. Seule l’administration décide de son statut de revue.'); await refresh(); } catch (e) { setMessage(`Envoi impossible : ${e instanceof Error ? e.message : 'erreur inconnue'}`); } finally { setBusy(false); } }
  return <Page title="Mes contributions" intro="Créez des brouillons et soumettez vos propositions à l’équipe de revue.">{loading ? <Loading /> : error ? <ErrorMessage>{error}</ErrorMessage> : <><form className="phase2-form phase2-submit-form" onSubmit={createDraft}><h2><Plus size={20} /> Nouvelle contribution</h2><label htmlFor="phase2-title">Titre <span aria-hidden="true">*</span></label><input id="phase2-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /><label htmlFor="phase2-description">Description</label><textarea id="phase2-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /><label htmlFor="phase2-type">Type de contribution</label><select id="phase2-type" value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)}><option value="course">Cours (proposition)</option><option value="resource">Ressource</option><option value="exercise">Exercice (proposition éditoriale)</option></select><label htmlFor="phase2-submission-subjects">Matières (séparées par des virgules)</label><input id="phase2-submission-subjects" value={subjects} onChange={(e) => setSubjects(e.target.value)} /><label htmlFor="phase2-submission-levels">Niveaux (séparés par des virgules)</label><input id="phase2-submission-levels" value={levels} onChange={(e) => setLevels(e.target.value)} /><label htmlFor="phase2-file">Fichier facultatif (PDF, MP4 ou WebM; 50 MiB maximum)</label><input id="phase2-file" type="file" accept="application/pdf,video/mp4,video/webm,.pdf,.mp4,.webm" onChange={chooseFile} /><p className="phase2-help">Le fichier est déposé dans un stockage privé et ne sera associé qu’après confirmation du stockage. Un brouillon peut être créé sans fichier.</p>{file && <p className="phase2-selected-file">{file.type.startsWith('video/') ? <Video size={16} /> : <FileText size={16} />}{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MiB</p>}{message && <p className="phase2-notice" role="status">{message}</p>}<button className="phase2-button" disabled={busy} type="submit">{busy ? <Loader2 className="phase2-spin" size={17} /> : <Plus size={17} />}{busy ? 'Traitement…' : 'Créer le brouillon'}</button></form><section className="phase2-section"><h2>Historique ({submissions.length})</h2>{!submissions.length ? <Empty>Aucune contribution enregistrée. Votre première proposition apparaîtra ici après création effective.</Empty> : <div className="phase2-card-list">{submissions.map((item) => <div key={item.id}><SubmissionCard item={item} reviews={reviews} />{(item.status === 'draft' || item.status === 'rejected') && <div className="phase2-actions"><button type="button" className="phase2-button phase2-button-secondary" disabled={busy} onClick={() => editSubmission(item)}><Pencil size={15} /> Modifier</button><button type="button" className="phase2-button" disabled={busy} onClick={() => void submitDraft(item.id)}><Send size={16} /> {item.status === 'rejected' ? 'Soumettre à nouveau' : 'Soumettre pour examen'}</button></div>}{editingId === item.id && <form className="phase2-form phase2-edit-submission" onSubmit={(event) => void saveSubmissionEdit(event)}><h3>Modifier le brouillon</h3><label className="phase2-field">Titre<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required maxLength={200}/></label><label className="phase2-field">Description<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={3000} rows={4}/></label><label className="phase2-field">Matières<input value={editSubjects} onChange={(event) => setEditSubjects(event.target.value)} /></label><label className="phase2-field">Niveaux<input value={editLevels} onChange={(event) => setEditLevels(event.target.value)} /></label><div className="phase2-actions"><button className="phase2-button" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button><button className="phase2-button phase2-button-secondary" type="button" onClick={() => setEditingId(null)}>Annuler</button></div></form>}</div>)}</div>}</section></>}</Page>;
}

export function TeacherResourcesPage() {
  const { submissions, reviews, loading, error } = useTeacherData(); const resources = submissions.filter((item) => item.content_type === 'resource');
  return <Page title="Mes ressources" intro="Retrouvez vos contributions de type ressource et leur état réel.">{loading ? <Loading /> : error ? <ErrorMessage>{error}</ErrorMessage> : resources.length ? <div className="phase2-card-list">{resources.map((item) => <SubmissionCard key={item.id} item={item} reviews={reviews} />)}</div> : <Empty>Aucune ressource dans vos contributions. Créez-en une depuis « Mes contributions ».</Empty>}</Page>;
}
export function TeacherCoursesPage() {
  const { submissions, reviews, loading, error } = useTeacherData(); const courses = submissions.filter((item) => item.content_type === 'course');
  return <Page title="Mes cours proposés" intro="Suivez les propositions de cours soumises à l’équipe de revue; aucune proposition n’est publiée comme contenu validé avant approbation admin.">{loading ? <Loading /> : error ? <ErrorMessage>{error}</ErrorMessage> : courses.length ? <div className="phase2-card-list">{courses.map((item) => <SubmissionCard key={item.id} item={item} reviews={reviews} />)}</div> : <Empty>Aucune proposition de cours. Créez-en une depuis « Mes contributions ».</Empty>}</Page>;
}

export function TeacherStatisticsPage() {
  const { submissions, loading, error } = useTeacherData(); const counts = useMemo(() => submissions.reduce<Record<ContentStatus, number>>((acc, s) => { acc[s.status] += 1; return acc; }, { draft: 0, submitted: 0, in_review: 0, approved: 0, rejected: 0 }), [submissions]);
  const kinds = useMemo(() => submissions.reduce<Record<ContentType, number>>((acc, s) => { acc[s.content_type] += 1; return acc; }, { course: 0, resource: 0, exercise: 0 }), [submissions]);
  return <Page title="Mes statistiques" intro="Indicateurs calculés uniquement à partir de vos propres enregistrements.">{loading ? <Loading /> : error ? <ErrorMessage>{error}</ErrorMessage> : !submissions.length ? <Empty>Aucune statistique disponible avant la création d’une contribution.</Empty> : <><section className="phase2-section"><h2>Par statut</h2><dl className="phase2-stat-grid">{(Object.keys(statusLabels) as ContentStatus[]).map((status) => <div className="phase2-stat" key={status}><dt>{statusLabels[status]}</dt><dd>{counts[status]}</dd></div>)}</dl></section><section className="phase2-section"><h2>Par type</h2><dl className="phase2-stat-grid">{(Object.keys(typeLabels) as ContentType[]).map((type) => <div className="phase2-stat" key={type}><dt>{typeLabels[type]}</dt><dd>{kinds[type]}</dd></div>)}</dl></section></>}</Page>;
}

export default TeacherDashboard;
