import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, Bell, Check, CheckCircle2, CircleHelp, GraduationCap, Link2, LoaderCircle, LockKeyhole, RefreshCw, Shield, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '../../lib/supabase';

type LinkRow = { id: string; parent_user_id: string; student_user_id: string; request_id: string; status: 'active' | 'revoked'; created_at: string; revoked_at: string | null };
type RequestRow = { id: string; parent_user_id: string; student_user_id: string; status: 'pending' | 'accepted' | 'rejected'; created_at: string; decided_at: string | null };
type Child = { userId: string; name: string; className: string | null };
type Activity = { id: string; activity_type: string; title: string; subject: string | null; score: number | null; score_max: number | null; occurred_at: string; details: unknown };
type Goal = { id: string; title: string; description: string | null; target_date: string | null; status: 'active' | 'paused' | 'achieved'; created_at: string };
type Notice = { id: string; notification_type: string; title: string; body: string; read_at: string | null; created_at: string };

const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : 'Sans échéance';
const shortId = (id: string) => `${id.slice(0, 8)}…`;
const errorText = 'Les données ne peuvent pas être chargées pour le moment. Vérifie la connexion, la configuration Supabase et l’application de la migration Phase 2, puis réessaie.';

function NoticeBox({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'error' | 'success' }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : CircleHelp;
  return <div className={`phase2-notice phase2-notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Icon size={18} aria-hidden="true" /><div>{children}</div></div>;
}
function Page({ title, intro, icon, children }: { title: string; intro: string; icon: ReactNode; children: ReactNode }) {
  return <main className="phase2-page"><header className="phase2-heading"><span className="phase2-heading-icon" aria-hidden="true">{icon}</span><div><h1>{title}</h1><p>{intro}</p></div></header>{children}</main>;
}
function LoadState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (loading) return <p className="phase2-state" role="status"><LoaderCircle size={18} className="phase2-spin" /> Chargement des données…</p>;
  if (error) return <NoticeBox kind="error">{error}<button className="phase2-button phase2-button-secondary" type="button" onClick={retry}><RefreshCw size={16} /> Réessayer</button></NoticeBox>;
  return null;
}
function useParentLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!user) { setLinks([]); setChildren([]); setLoading(false); return; }
    if (!supabase) { setError('Supabase n’est pas configuré. Les données famille restent hors ligne.'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: linkError } = await supabase.from('parent_student_links').select('id,parent_user_id,student_user_id,request_id,status,created_at,revoked_at').eq('parent_user_id', user.id).eq('status', 'active');
      if (linkError) throw linkError;
      const active = (data ?? []) as LinkRow[];
      setLinks(active);
      // Privacy boundary: student identity/profile is queried only after an active link is confirmed.
      if (!active.length) { setChildren([]); return; }
      const ids = active.map((link) => link.student_user_id);
      const [{ data: profiles, error: profileError }, { data: studentProfiles, error: studentError }] = await Promise.all([
        supabase.from('profiles').select('user_id,first_name,last_name').in('user_id', ids),
        supabase.from('student_profiles').select('user_id,class_id').in('user_id', ids),
      ]);
      if (profileError || studentError) throw profileError ?? studentError;
      const classes = (studentProfiles ?? []).map((row) => row.class_id);
      const classResult = classes.length ? await supabase.from('school_classes').select('id,name').in('id', classes) : { data: [], error: null };
      if (classResult.error) throw classResult.error;
      setChildren(ids.map((id) => {
        const profile = profiles?.find((row) => row.user_id === id);
        const student = studentProfiles?.find((row) => row.user_id === id);
        return { userId: id, name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Élève', className: classResult.data?.find((row) => row.id === student?.class_id)?.name ?? null };
      }));
    } catch { setError(errorText); setLinks([]); setChildren([]); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  return { links, children, loading, error, refresh };
}
function useSelectedChild() {
  const data = useParentLinks();
  const [selectedId, setSelectedId] = useState('');
  const effectiveSelectedId = data.children.some((child) => child.userId === selectedId) ? selectedId : data.children[0]?.userId ?? '';
  const selected = data.children.find((child) => child.userId === effectiveSelectedId) ?? null;
  const selector = data.children.length > 1 ? <label className="phase2-field">Enfant lié<select value={effectiveSelectedId} onChange={(event) => setSelectedId(event.target.value)}>{data.children.map((child) => <option key={child.userId} value={child.userId}>{child.name}</option>)}</select></label> : selected ? <p className="phase2-selected"><UserRound size={17} /> {selected.name}{selected.className ? ` · ${selected.className}` : ''}</p> : null;
  return { ...data, selected, selector };
}
function ChildStatus({ refresh }: { refresh: () => void }) {
  const linkState = useParentLinks();
  const { links, children, loading, error } = linkState;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const revoke = async (linkId: string) => {
    if (!supabase || !window.confirm('Révoquer ce lien parent-enfant ? Les données de l’enfant ne seront plus accessibles.')) return;
    setBusy(linkId); setMessage('');
    const { error: rpcError } = await supabase.rpc('phase2_revoke_parent_link', { p_link_id: linkId });
    setBusy(null);
    if (rpcError) setMessage('Le lien n’a pas pu être révoqué. Réessaie plus tard.'); else { setMessage('Lien révoqué.'); await Promise.all([linkState.refresh(), refresh()]); }
  };
  return <section className="phase2-card"><h2>Liens actifs</h2><LoadState loading={loading} error={error} retry={refresh} />{!loading && !error && !links.length && <p className="phase2-empty">Aucun enfant n’est actuellement lié à ce compte.</p>}{links.map((link) => <article className="phase2-row" key={link.id}><div><strong>{children.find((child) => child.userId === link.student_user_id)?.name ?? 'Élève lié'}</strong><small>Lien actif depuis le {dateLabel(link.created_at)}</small></div><button className="phase2-button phase2-button-danger" disabled={Boolean(busy)} onClick={() => void revoke(link.id)} type="button">{busy === link.id ? 'Révocation…' : 'Révoquer'}</button></article>)}{message && <p role="status">{message}</p>}</section>;
}
function RelationshipNote() { return <NoticeBox><strong>Une liaison n’est pas une vérification légale de tutelle.</strong><br />C’est une confirmation de compte à compte : le parent envoie une demande avec un code et l’élève doit l’accepter. Le parent comme l’élève peut ensuite révoquer le lien.</NoticeBox>; }

export function ParentDashboard() {
  const links = useParentLinks();
  return <Page title="Espace famille" intro="Un aperçu des informations réellement disponibles pour vos enfants liés." icon={<Users size={22} />}><LoadState loading={links.loading} error={links.error} retry={links.refresh} />{!links.loading && !links.error && <>{!links.children.length ? <NoticeBox>Aucun lien actif. La progression et les résultats restent masqués jusqu’à l’acceptation d’une demande par l’élève.</NoticeBox> : <><section className="phase2-card"><h2>Enfants liés</h2><ul className="phase2-list">{links.children.map((child) => <li key={child.userId}><strong>{child.name}</strong>{child.className && <span>{child.className}</span>}</li>)}</ul></section><NoticeBox>Aucune activité pédagogique ne sera affichée tant qu’il n’existe pas de données EduFlow réelles.</NoticeBox></>}</>}<RelationshipNote /></Page>;
}
export function ParentChildrenPage() {
  const links = useParentLinks();
  const [code, setCode] = useState(''); const [codeInput, setCodeInput] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !codeInput.trim()) return; setBusy(true); setMessage(''); const { error } = await supabase.rpc('phase2_request_parent_link', { p_code: codeInput.trim() }); setBusy(false); setCodeInput(''); setMessage(error ? 'La demande n’a pas pu être envoyée. Vérifie le code puis réessaie.' : 'Demande envoyée. L’accès ne sera activé qu’après acceptation par l’élève.'); if (!error) await links.refresh(); };
  return <Page title="Enfants et liens" intro="Connectez les comptes avec accord explicite de l’élève." icon={<Link2 size={22} />}><RelationshipNote /><section className="phase2-card"><h2>Envoyer une demande</h2><p>Demandez à l’élève de générer un code dans son espace, puis saisissez-le ici. Aucun profil n’est révélé avant son acceptation.</p><form className="phase2-form" onSubmit={(event) => void submit(event)}><label className="phase2-field">Code de liaison<input value={codeInput} onChange={(event) => setCodeInput(event.target.value)} autoComplete="off" required maxLength={100} /></label><button className="phase2-button" type="submit" disabled={busy || !supabase}>{busy ? 'Envoi…' : 'Envoyer la demande'}</button></form></section><ChildStatus refresh={links.refresh} />{message && <NoticeBox kind={message.startsWith('La demande') || message.startsWith('Le code') ? 'error' : 'success'}>{message}</NoticeBox>}{code && <section className="phase2-card"><h2>Votre code (affiché une seule fois)</h2><p className="phase2-code" aria-label="Code de liaison">{code}</p><p>Transmettez ce code à votre parent. Quitter cette page fera disparaître le code.</p><button className="phase2-button phase2-button-secondary" type="button" onClick={() => setCode('')}>Masquer le code</button></section>}</Page>;
}
type ReportPeriod = 'weekly' | 'monthly' | 'all';
type ActivityKind = 'chapter_completed' | 'exercise_result' | 'exam_result' | 'difficulty';
type ActivityCounts = Record<ActivityKind, number>;
const activityKinds: ActivityKind[] = ['chapter_completed', 'exercise_result', 'exam_result', 'difficulty'];
const resultActivityKinds: ActivityKind[] = ['exercise_result', 'exam_result'];
const emptyActivityCounts = (): ActivityCounts => ({ chapter_completed: 0, exercise_result: 0, exam_result: 0, difficulty: 0 });
function reportStart(period: ReportPeriod) {
  const now = new Date();
  if (period === 'weekly') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return null;
}
function useStudentData(studentId: string | undefined, period: ReportPeriod = 'all', onlyKinds?: ActivityKind[]) {
  const [goals, setGoals] = useState<Goal[]>([]); const [activity, setActivity] = useState<Activity[]>([]); const [activityTotal, setActivityTotal] = useState(0); const [activityCounts, setActivityCounts] = useState<ActivityCounts>(emptyActivityCounts); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!studentId) { setGoals([]); setActivity([]); setActivityTotal(0); setActivityCounts(emptyActivityCounts()); setLoading(false); setError(null); return; }
    if (!supabase) { setError('Supabase n’est pas configuré.'); setLoading(false); return; }
    const client = supabase;
    setLoading(true); setError(null);
    try {
      const start = reportStart(period);
      const pageLimit = period === 'all' ? 200 : 500;
      let activityQuery = client.from('learning_activity').select('id,activity_type,title,subject,score,score_max,occurred_at,details', { count: 'exact' }).eq('student_user_id', studentId).order('occurred_at', { ascending: false }).order('id', { ascending: true });
      if (start) activityQuery = activityQuery.gte('occurred_at', start);
      if (onlyKinds?.length) activityQuery = activityQuery.in('activity_type', onlyKinds);
      activityQuery = activityQuery.limit(pageLimit);
      const countPromise = Promise.all(activityKinds.map(async (type) => {
        let countQuery = client.from('learning_activity').select('id', { count: 'exact', head: true }).eq('student_user_id', studentId).eq('activity_type', type);
        if (start) countQuery = countQuery.gte('occurred_at', start);
        return { type, result: await countQuery };
      }));
      const [g, a, countsResult] = await Promise.all([
        client.from('learning_goals').select('id,title,description,target_date,status,created_at').eq('student_user_id', studentId).order('created_at', { ascending: false }),
        activityQuery,
        countPromise,
      ]);
      if (g.error || a.error) throw g.error ?? a.error;
      const countError = countsResult.find(({ result }) => result.error)?.result.error;
      if (countError) throw countError;
      const counts = emptyActivityCounts();
      for (const { type, result } of countsResult) counts[type] = result.count ?? 0;
      setGoals((g.data ?? []) as Goal[]); setActivity((a.data ?? []) as Activity[]); setActivityTotal(a.count ?? a.data?.length ?? 0); setActivityCounts(counts);
    } catch { setError(errorText); setGoals([]); setActivity([]); setActivityTotal(0); setActivityCounts(emptyActivityCounts()); }
    finally { setLoading(false); }
  }, [studentId, period, onlyKinds]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  return { goals, activity, activityTotal, activityCounts, loading, error, refresh };
}
function ChildGate({ loading, error, children, refresh, selector, selected }: { loading: boolean; error: string | null; children: ReactNode; refresh: () => void; selector: ReactNode; selected: Child | null }) {
  return <>{loading || error ? <LoadState loading={loading} error={error} retry={refresh} /> : !selected ? <NoticeBox>Aucun enfant lié activement à ce compte. Aucune donnée élève n’a été consultée.</NoticeBox> : <>{selector}{children}</>}</>;
}
export function ParentProgressPage() {
  const link = useSelectedChild();
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const data = useStudentData(link.selected?.userId, reportPeriod);
  const [goalTitle, setGoalTitle] = useState(''); const [goalDescription, setGoalDescription] = useState(''); const [goalDate, setGoalDate] = useState(''); const [goalSaving, setGoalSaving] = useState(false); const [goalMessage, setGoalMessage] = useState('');
  const createGoal = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !link.selected || !goalTitle.trim()) return; setGoalSaving(true); setGoalMessage(''); const { error } = await supabase.rpc('phase2_create_learning_goal', { p_student_user_id: link.selected.userId, p_title: goalTitle.trim(), p_description: goalDescription.trim() || null, p_target_date: goalDate || null }); setGoalSaving(false); if (error) setGoalMessage('L’objectif n’a pas pu être créé. Réessaie.'); else { setGoalTitle(''); setGoalDescription(''); setGoalDate(''); setGoalMessage('Objectif créé.'); await data.refresh(); } };
  const periodLabel = reportPeriod === 'weekly' ? '7 derniers jours' : 'mois en cours';
  return <Page title="Progrès et objectifs" intro="Consultez les objectifs et activités réellement enregistrés dans EduFlow." icon={<GraduationCap size={22} />}><ChildGate loading={link.loading} error={link.error} refresh={link.refresh} selector={link.selector} selected={link.selected}>{data.loading || data.error ? <LoadState loading={data.loading} error={data.error} retry={data.refresh} /> : <>
    <section className="phase2-card"><h2>Rapport de progression</h2><p>Rapport consulté à la demande, calculé uniquement à partir des activités EduFlow réelles de l’enfant sélectionné.</p><label className="phase2-field">Période du rapport<select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value as 'weekly' | 'monthly')}><option value="weekly">Hebdomadaire · 7 derniers jours</option><option value="monthly">Mensuel · mois en cours</option></select></label><div className="phase2-report-period"><span>Période sélectionnée</span><strong>{periodLabel}</strong></div><dl className="phase2-stat-grid phase2-report-stats"><div className="phase2-stat"><dt>Chapitres terminés</dt><dd>{data.activityCounts.chapter_completed}</dd></div><div className="phase2-stat"><dt>Résultats d’exercices</dt><dd>{data.activityCounts.exercise_result}</dd></div><div className="phase2-stat"><dt>Résultats d’examens</dt><dd>{data.activityCounts.exam_result}</dd></div><div className="phase2-stat"><dt>Difficultés consignées</dt><dd>{data.activityCounts.difficulty}</dd></div></dl>{data.activityTotal > data.activity.length && <p className="phase2-help">Affichage des {data.activity.length} activités les plus récentes sur {data.activityTotal}; les compteurs ci-dessus couvrent toutes les activités de la période.</p>}{data.activityTotal === 0 ? <p className="phase2-empty">Aucune activité n’a été enregistrée sur cette période. Aucun progrès ou résultat n’est simulé.</p> : <ActivityList rows={data.activity} />}</section>
    <section className="phase2-card"><h2>Objectifs d’apprentissage</h2><p>Les parents peuvent proposer des objectifs pour un enfant dont la liaison est active.</p><form className="phase2-form" onSubmit={(event) => void createGoal(event)}><label className="phase2-field">Nouvel objectif<input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} maxLength={160} required /></label><label className="phase2-field">Description (facultatif)<textarea value={goalDescription} onChange={(event) => setGoalDescription(event.target.value)} maxLength={1000} rows={3} /></label><label className="phase2-field">Date cible (facultatif)<input type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} /></label><button className="phase2-button" type="submit" disabled={goalSaving || !supabase}>{goalSaving ? 'Création…' : 'Créer l’objectif'}</button></form>{goalMessage && <p role="status">{goalMessage}</p>}{!data.goals.length ? <p className="phase2-empty">Aucun objectif enregistré pour cet enfant.</p> : <ul className="phase2-list">{data.goals.map((goal) => <li key={goal.id}><strong>{goal.title}</strong><span>{goal.description || 'Sans description'} · {goal.status === 'achieved' ? 'Atteint' : goal.status === 'paused' ? 'En pause' : 'En cours'} · échéance : {dateLabel(goal.target_date)}</span></li>)}</ul>}</section>
  </>}</ChildGate></Page>;
}
function ActivityList({ rows }: { rows: Activity[] }) { return <ul className="phase2-list">{rows.map((row) => <li key={row.id}><strong>{row.title}</strong><span>{row.subject ? `${row.subject} · ` : ''}{row.activity_type.replaceAll('_', ' ')} · {dateLabel(row.occurred_at)}{row.score !== null ? ` · résultat : ${row.score}${row.score_max !== null ? ` / ${row.score_max}` : ''}` : ''}</span></li>)}</ul>; }
export function ParentResultsPage() {
  const link = useSelectedChild(); const data = useStudentData(link.selected?.userId, 'all', resultActivityKinds); const results = data.activity;
  return <Page title="Résultats EduFlow" intro="Résultats d’exercices ou d’examens effectivement enregistrés, sans projection ni estimation." icon={<CheckCircle2 size={22} />}><ChildGate loading={link.loading} error={link.error} refresh={link.refresh} selector={link.selector} selected={link.selected}>{data.loading || data.error ? <LoadState loading={data.loading} error={data.error} retry={data.refresh} /> : <section className="phase2-card"><h2>Résultats enregistrés</h2>{data.activityTotal > results.length && <p className="phase2-help">Affichage des {results.length} résultats les plus récents sur {data.activityTotal} résultats enregistrés.</p>}{data.activityTotal === 0 ? <p className="phase2-empty">Aucune donnée disponible. Les moteurs de cours, d’exercices et d’examens des phases ultérieures ne sont pas encore actifs.</p> : <ActivityList rows={results} />}</section>}</ChildGate></Page>;
}
export function ParentNotificationsPage() {
 const { user } = useAuth(); const [rows,setRows]=useState<Notice[]>([]); const [frequency,setFrequency]=useState<'none'|'weekly'|'monthly'>('none'); const [enabled,setEnabled]=useState(true); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{if(!user){setRows([]);setLoading(false);return;} if(!supabase){setError('Supabase n’est pas configuré.');setLoading(false);return;} setLoading(true);setError(null); try{const [n,p]=await Promise.all([supabase.from('notifications').select('id,notification_type,title,body,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),supabase.from('notification_preferences').select('report_frequency,in_app_enabled').eq('user_id',user.id).maybeSingle()]);if(n.error||p.error)throw n.error??p.error;setRows((n.data??[]) as Notice[]);if(p.data){setFrequency(p.data.report_frequency);setEnabled(p.data.in_app_enabled);}}catch{setError(errorText);setRows([]);}finally{setLoading(false);}},[user]); useEffect(()=>{const timer=window.setTimeout(()=>{void refresh();},0);return()=>window.clearTimeout(timer);},[refresh]);
 const savePrefs=async(event:FormEvent)=>{event.preventDefault();if(!supabase)return;setBusy(true);const {error:e}=await supabase.rpc('phase2_update_notification_preferences',{p_report_frequency:frequency,p_in_app_enabled:enabled});setBusy(false);setMessage(e?'Préférences non enregistrées.':'Préférences enregistrées.');};
 const markRead=async(id:string)=>{if(!supabase)return;setBusy(true);const {error:e}=await supabase.rpc('phase2_mark_notification_read',{p_notification_id:id});setBusy(false);if(e)setMessage('La notification n’a pas pu être marquée comme lue.');else{setRows((current)=>current.map((row)=>row.id===id?{...row,read_at:new Date().toISOString()}:row));setMessage('Notification marquée comme lue.');}};
 return <Page title="Notifications et rapports" intro="Seules les notifications de ce compte sont affichées. Les rapports peuvent être hebdomadaires ou mensuels, à la demande." icon={<Bell size={22}/>}><LoadState loading={loading} error={error} retry={refresh}/>{!loading&&!error&&<><form className="phase2-card phase2-form" onSubmit={(event)=>void savePrefs(event)}><h2>Préférences de rapport</h2><p>La période du rapport se choisit dans « Progrès et objectifs ». Aucun envoi automatique par email ou notification planifiée n’est activé actuellement.</p><label className="phase2-field">Fréquence souhaitée<select value={frequency} onChange={(event)=>setFrequency(event.target.value as 'none'|'weekly'|'monthly')}><option value="none">Aucun rapport</option><option value="weekly">Hebdomadaire</option><option value="monthly">Mensuelle</option></select></label><label className="phase2-check"><input type="checkbox" checked={enabled} onChange={(event)=>setEnabled(event.target.checked)}/> Notifications in-app des événements EduFlow activées</label><p className="phase2-help">Les messages envoyés manuellement par l’administration peuvent rester visibles même si cette option est désactivée.</p><button className="phase2-button" type="submit" disabled={busy}>{busy?'Enregistrement…':'Enregistrer'}</button></form><section className="phase2-card"><h2>Vos notifications</h2>{!rows.length?<p className="phase2-empty">Aucune notification disponible.</p>:<ul className="phase2-list">{rows.map((row)=><li key={row.id}><strong>{row.title}</strong><span>{row.body} · {dateLabel(row.created_at)}{row.read_at?' · Lue':' · Non lue'}</span>{!row.read_at&&<button className="phase2-button phase2-button-secondary" type="button" disabled={busy} onClick={()=>void markRead(row.id)}><Check size={16}/> Marquer comme lue</button>}</li>)}</ul>}</section></>}{message&&<p role="status">{message}</p>}</Page>;
}
export function ParentProfilePage() { const { user,profile,loading,accountLoading,accountError,refreshAccount }=useAuth(); const links=useParentLinks(); return <Page title="Mon profil parent" intro="Informations liées à votre compte et réglages de liaison." icon={<UserRound size={22}/>}><LoadState loading={loading||accountLoading} error={accountError} retry={()=>void refreshAccount()}/>{!loading&&!accountLoading&&!accountError&&<section className="phase2-card"><h2>Compte</h2><p><strong>{[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Nom non renseigné'}</strong></p><p>{user?.email||'Adresse non disponible'}</p><p className="phase2-muted">Les informations du profil proviennent de Supabase.</p></section>}<RelationshipNote/><ChildStatus refresh={links.refresh}/></Page>; }
export function StudentGuardianLinksPage() {
 const {user}=useAuth(); const [requests,setRequests]=useState<RequestRow[]>([]); const [links,setLinks]=useState<LinkRow[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState<string|null>(null); const [code,setCode]=useState(''); const [message,setMessage]=useState('');
 const refresh=useCallback(async()=>{if(!user){setRequests([]);setLinks([]);setLoading(false);return;}if(!supabase){setError('Supabase n’est pas configuré. Les demandes de liaison sont hors ligne.');setLoading(false);return;}setLoading(true);setError(null);try{const [r,l]=await Promise.all([supabase.from('parent_link_requests').select('id,parent_user_id,student_user_id,status,created_at,decided_at').eq('student_user_id',user.id).eq('status','pending').order('created_at',{ascending:false}),supabase.from('parent_student_links').select('id,parent_user_id,student_user_id,request_id,status,created_at,revoked_at').eq('student_user_id',user.id).eq('status','active')]);if(r.error||l.error)throw r.error??l.error;setRequests((r.data??[]) as RequestRow[]);setLinks((l.data??[]) as LinkRow[]);}catch{setError(errorText);setRequests([]);setLinks([]);}finally{setLoading(false);}},[user]); useEffect(()=>{const timer=window.setTimeout(()=>{void refresh();},0);return()=>window.clearTimeout(timer);},[refresh]);
 const generate=async()=>{if(!supabase||!window.confirm('Ce code ne sera visible qu’une fois. Générer un code de liaison ?'))return;setBusy('code');setMessage('');const {data,error:e}=await supabase.rpc('phase2_generate_parent_link_code',{});setBusy(null);if(e)setMessage('Code impossible à générer.');else setCode(data);};
 const decide=async(id:string,accept:boolean)=>{if(!supabase)return;if(!window.confirm(accept?'Accepter cette demande de liaison ?':'Refuser cette demande ?'))return;setBusy(id);const {error:e}=await supabase.rpc('phase2_decide_parent_link',{p_request_id:id,p_accept:accept});setBusy(null);setMessage(e?'La décision n’a pas pu être enregistrée.':'Décision enregistrée.');if(!e)await refresh();};
 const revoke=async(id:string)=>{if(!supabase||!window.confirm('Révoquer le lien actif ?'))return;setBusy(id);const {error:e}=await supabase.rpc('phase2_revoke_parent_link',{p_link_id:id});setBusy(null);setMessage(e?'Le lien n’a pas pu être révoqué.':'Lien révoqué.');if(!e)await refresh();};
 return <Page title="Liaisons parentales" intro="Décidez vous-même des demandes de liaison avec votre compte étudiant." icon={<Shield size={22}/>}><RelationshipNote/><section className="phase2-card"><h2>Code pour votre parent</h2><p>Le code permet à un compte parent d’envoyer une demande; il ne donne aucun accès tant que vous ne l’avez pas acceptée. Un code ne s’affichera qu’une fois.</p><button className="phase2-button" type="button" onClick={()=>void generate()} disabled={busy==='code'||!supabase}>{busy==='code'?'Génération…':'Générer un code'}</button>{code&&<div className="phase2-once"><strong>Code (affiché une seule fois)</strong><p className="phase2-code">{code}</p><button type="button" className="phase2-button phase2-button-secondary" onClick={()=>setCode('')}>Masquer</button></div>}</section><section className="phase2-card"><h2>Demandes entrantes</h2><LoadState loading={loading} error={error} retry={refresh}/>{!loading&&!error&&!requests.length&&<p className="phase2-empty">Aucune demande en attente.</p>}{requests.map((request)=><article className="phase2-row" key={request.id}><div><strong>Demande · {shortId(request.id)}</strong><small>Reçue le {dateLabel(request.created_at)}. Aucune information de profil parent n’est affichée avant la liaison.</small></div><div className="phase2-actions"><button className="phase2-button" type="button" disabled={Boolean(busy)} onClick={()=>void decide(request.id,true)}><Check size={16}/> Accepter</button><button className="phase2-button phase2-button-danger" type="button" disabled={Boolean(busy)} onClick={()=>void decide(request.id,false)}><X size={16}/> Refuser</button></div></article>)}</section><section className="phase2-card"><h2>Liens actifs</h2>{!loading&&!error&&!links.length&&<p className="phase2-empty">Aucun lien actif.</p>}{links.map((link)=><article className="phase2-row" key={link.id}><div><strong>Lien actif · {shortId(link.id)}</strong><small>Depuis le {dateLabel(link.created_at)}. Vous pouvez le révoquer à tout moment.</small></div><button className="phase2-button phase2-button-danger" type="button" disabled={Boolean(busy)} onClick={()=>void revoke(link.id)}>Révoquer</button></article>)}</section>{message&&<NoticeBox kind={message.includes('pas pu')||message.includes('impossible')?'error':'success'}>{message}</NoticeBox>}<NoticeBox><LockKeyhole size={16}/> Les profils parents ne sont pas interrogés pour afficher les demandes entrantes.</NoticeBox></Page>;
}
