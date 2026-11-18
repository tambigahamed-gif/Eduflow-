import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, Check, FileText, LoaderCircle, Send, Video } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '../../lib/supabase';
import { LearningEmpty, LearningError, LearningLoading, LearningPage, LearningStatus } from '../learning/LearningCommon';
import { parseVideoLink } from '../learning/videoLinks';
import { sanitizeResourceFilename } from './resourceFilename';
import type { ContentReviewStatus, Database, Json, LearningResourceType } from '../../types/database';

type System = Database['public']['Tables']['education_systems']['Row'];
type Level = Database['public']['Tables']['school_levels']['Row'];
type ClassRow = Database['public']['Tables']['school_classes']['Row'];
type Series = Database['public']['Tables']['school_series']['Row'];
type Subject = Database['public']['Tables']['school_subjects']['Row'];
type Chapter = Database['public']['Tables']['school_chapters']['Row'];
type Review = Database['public']['Tables']['content_reviews']['Row'];
type TeacherProfile = Database['public']['Tables']['teacher_profiles']['Row'];
type Submission = Database['public']['Tables']['content_submissions']['Row'];
type Mode = 'lesson' | 'video' | 'resource';
const modeLabel: Record<Mode, string> = { lesson: 'Leçon', video: 'Vidéo externe', resource: 'Ressource' };
const resourceTypes: LearningResourceType[] = ['pdf', 'document', 'image', 'illustration', 'revision_sheet', 'audio', 'other'];
const acceptedMime = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'text/plain']);
const maxFileBytes = 50 * 1024 * 1024;
const emptyData = { systems: [] as System[], levels: [] as Level[], classes: [] as ClassRow[], series: [] as Series[], subjects: [] as Subject[], chapters: [] as Chapter[], submissions: [] as Submission[], reviews: [] as Review[], profile: null as TeacherProfile | null };
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Une erreur inconnue est survenue.';
const check = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
function Notice({ error, success }: { error?: string; success?: string }) { return error ? <p className="phase2-alert phase2-alert-error" role="alert"><AlertCircle size={17}/>{error}</p> : success ? <p className="phase2-notice" role="status"><Check size={17}/>{success}</p> : null; }
function SelectField({ label, value, onChange, rows, empty }: { label: string; value: string; onChange: (value: string) => void; rows: Array<{ id: string; name: string }>; empty: string }) { return <label>{label}<select required value={value} onChange={(e) => onChange(e.target.value)}><option value="">{empty}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>; }

export function TeacherLearningSubmissionsPage() {
  const { user, roles, loading: authLoading, accountLoading } = useAuth();
  const [data, setData] = useState(emptyData); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [version, setVersion] = useState(0);
  const [mode, setMode] = useState<Mode>('lesson'); const [systemId, setSystemId] = useState(''); const [classId, setClassId] = useState(''); const [subjectId, setSubjectId] = useState(''); const [seriesId, setSeriesId] = useState(''); const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [courseTitle, setCourseTitle] = useState(''); const [courseDescription, setCourseDescription] = useState(''); const [objectives, setObjectives] = useState(''); const [introduction, setIntroduction] = useState(''); const [explanation, setExplanation] = useState(''); const [definitions, setDefinitions] = useState(''); const [examples, setExamples] = useState(''); const [formulas, setFormulas] = useState(''); const [illustrations, setIllustrations] = useState(''); const [exercises, setExercises] = useState(''); const [summary, setSummary] = useState(''); const [keyPoints, setKeyPoints] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [duration, setDuration] = useState(''); const [resourceType, setResourceType] = useState<LearningResourceType>('pdf'); const [file, setFile] = useState<File | null>(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true; const timer = window.setTimeout(() => { const client = supabase; if (!client || !user || !roles.includes('teacher')) { setLoading(false); return; } setLoading(true); setError('');
      void Promise.all([
        client.from('teacher_profiles').select('*').eq('user_id', user.id).maybeSingle(), client.from('content_submissions').select('*').eq('teacher_user_id', user.id).in('content_type', ['lesson', 'video', 'resource']).order('created_at', { ascending: false }),
        client.from('education_systems').select('*').eq('is_active', true).order('name'), client.from('school_levels').select('*').eq('is_active', true).order('sort_order'), client.from('school_classes').select('*').eq('is_active', true).order('sort_order'), client.from('school_series').select('*').eq('is_active', true).order('name'), client.from('school_subjects').select('*').eq('is_active', true).order('name'), client.from('school_chapters').select('*').eq('is_active', true).order('sort_order'),
      ]).then(async ([profile, submissions, systems, levels, classes, series, subjects, chapters]) => {
        const firstError = [profile.error, submissions.error, systems.error, levels.error, classes.error, series.error, subjects.error, chapters.error].find(Boolean); if (firstError) throw firstError;
        const rows = (submissions.data ?? []).filter((row) => row.content_type !== 'resource' || Boolean(row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) && 'phase3' in row.metadata));
        let reviews: Review[] = [];
        if (rows.length) { const result = await client.from('content_reviews').select('*').in('submission_id', rows.map((row) => row.id)).order('created_at', { ascending: false }); if (result.error) throw result.error; reviews = result.data ?? []; }
        if (active) setData({ profile: profile.data, submissions: rows, reviews, systems: systems.data ?? [], levels: levels.data ?? [], classes: classes.data ?? [], series: series.data ?? [], subjects: subjects.data ?? [], chapters: chapters.data ?? [] });
      }).catch((cause: unknown) => { if (active) setError(errorText(cause)); }).finally(() => { if (active) setLoading(false); });
    }, 0); return () => { active = false; window.clearTimeout(timer); };
  }, [user, roles, version]);
  const classes = useMemo(() => data.classes.filter((row) => !systemId || data.levels.find((level) => level.id === row.school_level_id)?.education_system_id === systemId).map((row) => ({ id: row.id, name: `${data.levels.find((level) => level.id === row.school_level_id)?.name ?? 'Niveau'} · ${row.name}` })), [data.classes, data.levels, systemId]);
  const subjects = useMemo(() => data.subjects.filter((row) => !systemId || row.education_system_id === systemId), [data.subjects, systemId]);
  const series = useMemo(() => data.series.filter((row) => !systemId || row.education_system_id === systemId), [data.series, systemId]);
  const chapters = useMemo(() => data.chapters.filter((row) => !classId || row.class_id === classId).filter((row) => !subjectId || row.subject_id === subjectId).map((row) => ({ id: row.id, name: row.title })), [data.chapters, classId, subjectId]);
  const mutate = async (action: () => Promise<void>, success: string) => { setBusy(true); setError(''); setNotice(''); try { await action(); setNotice(success); refresh(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); } };
  const lines = (value: string) => value.split('\n').map((part) => part.trim()).filter(Boolean);
  const clearForm = () => { setTitle(''); setDescription(''); setCourseTitle(''); setCourseDescription(''); setObjectives(''); setIntroduction(''); setExplanation(''); setDefinitions(''); setExamples(''); setFormulas(''); setIllustrations(''); setExercises(''); setSummary(''); setKeyPoints(''); setVideoUrl(''); setThumbnailUrl(''); setDuration(''); setFile(null); };
  const createDraft = (event: FormEvent) => {
    event.preventDefault(); void mutate(async () => {
      if (!supabase || !user) throw new Error('Session Supabase requise.');
      const parsedVideo = mode === 'video' ? parseVideoLink(videoUrl) : null;
      if (mode === 'video' && !parsedVideo) throw new Error('Utilise une URL HTTPS valide provenant de YouTube ou Vimeo. eduschole ne stocke pas la vidéo.');
      if (mode === 'video' && thumbnailUrl.trim() && new URL(thumbnailUrl).protocol !== 'https:') throw new Error('La miniature doit utiliser HTTPS.');
      if (mode === 'resource' && (!file || !acceptedMime.has(file.type) || file.size <= 0 || file.size > maxFileBytes)) throw new Error('Choisis un PDF, document, image ou fichier audio pris en charge (50 MiB maximum).');
      if (!title.trim()) throw new Error('Le titre est obligatoire.');
      if ((mode === 'lesson' || mode === 'video') && !description.trim()) throw new Error('Une description courte est nécessaire avant de soumettre une leçon ou une vidéo.');
      const { data: id, error: createError } = await supabase.rpc('phase2_create_content_draft', { p_content_type: mode, p_title: title.trim(), p_description: description.trim() }); check(createError); if (!id) throw new Error('Le brouillon n’a retourné aucun identifiant.');
      let asset: { path: string; name: string; mime: string; size: number } | null = null;
      if (mode === 'resource' && file) { const safeName = sanitizeResourceFilename(file.name); const path = `${user.id}/${id}/${safeName}`; const { error: uploadError } = await supabase.storage.from('eduflow-teacher-contributions').upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) throw new Error(`Upload privé échoué : ${uploadError.message}`); asset = { path, name: safeName, mime: file.type, size: file.size }; }
      const phase3: Record<string, Json> = mode === 'lesson' ? {
        education_system_id: systemId, class_id: classId, subject_id: subjectId, series_id: seriesId, chapter_id: chapterId,
        course_title: courseTitle.trim() || title.trim(), course_description: courseDescription.trim(), learning_objectives: lines(objectives), introduction: introduction.trim(), explanation: explanation.trim(), definitions: lines(definitions), examples: lines(examples), formulas: lines(formulas), illustrations: lines(illustrations), exercises: lines(exercises), summary: summary.trim(), key_points: lines(keyPoints),
      } : mode === 'video' ? { education_system_id: systemId, class_id: classId, subject_id: subjectId, series_id: seriesId, chapter_id: chapterId, provider: parsedVideo!.provider, external_url: videoUrl.trim(), thumbnail_url: thumbnailUrl.trim(), duration_seconds: duration ? Number(duration) : null } : { education_system_id: systemId, class_id: classId, subject_id: subjectId, series_id: seriesId, chapter_id: chapterId, title: title.trim(), description: description.trim(), resource_type: resourceType };
      const metadata = { phase3 } as unknown as Json;
      const { error: updateError } = await supabase.from('content_submissions').update({ metadata, subjects: [data.subjects.find((row) => row.id === subjectId)?.name ?? ''], levels: [data.levels.find((row) => row.id === data.classes.find((item) => item.id === classId)?.school_level_id)?.name ?? ''], assets: asset ? [asset] as unknown as Json : [] }).eq('id', id).eq('teacher_user_id', user.id);
      if (updateError) { if (asset) await supabase.storage.from('eduflow-teacher-contributions').remove([asset.path]); throw updateError; }
      clearForm();
    }, 'Brouillon créé dans Supabase. Il n’est pas publié. Vérifie-le dans l’historique puis soumets-le à l’équipe administrative.');
  };
  const submit = (submissionId: string) => void mutate(async () => { if (!supabase) throw new Error('Supabase non configuré.'); const row = data.submissions.find((submission) => submission.id === submissionId); const assets = Array.isArray(row?.assets) ? row.assets : []; if (!row || (!row.description.trim() && assets.length === 0)) throw new Error('Ajoute une description courte ou un fichier avant de soumettre cette contribution.'); const { error: result } = await supabase.rpc('phase2_submit_content', { p_submission_id: submissionId }); check(result); }, 'Contribution transmise pour examen. Seule l’administration peut l’approuver puis la publier.');
  if (authLoading || accountLoading) return <LearningPage title="Contributions pédagogiques"><LearningLoading/></LearningPage>;
  if (!supabase) return <LearningPage title="Contributions pédagogiques"><LearningError message="Supabase n’est pas configuré; aucune soumission n’est simulée."/></LearningPage>;
  if (!user || !roles.includes('teacher')) return <LearningPage title="Contributions pédagogiques"><LearningError message="Accès réservé à un compte enseignant autorisé par l’administration."/></LearningPage>;
  return <LearningPage title="Contributions pédagogiques" description="Créez des brouillons de leçons, ressources et vidéos externes, puis soumettez-les à la revue administrative. Les enseignants ne peuvent ni approuver ni publier.">
    <Notice error={error} success={notice}/>{loading ? <LearningLoading/> : !data.profile || !data.profile.is_active ? <LearningEmpty title="Profil enseignant non actif" description="Votre profil doit être créé et activé par l’administration avant tout dépôt."/> : <>
      <form className="learning-admin-form learning-admin-panel" onSubmit={createDraft}>
        <div className="learning-admin-tabs" role="tablist" aria-label="Type de contribution">{(['lesson', 'video', 'resource'] as Mode[]).map((value) => <button key={value} type="button" role="tab" aria-selected={mode === value} className={`phase2-button${mode === value ? '' : ' phase2-button-secondary'}`} onClick={() => setMode(value)}>{modeLabel[value]}</button>)}</div>
        <SelectField label="Système éducatif" value={systemId} onChange={(value) => { setSystemId(value); setClassId(''); setSubjectId(''); setSeriesId(''); setChapterId(''); }} rows={data.systems} empty="Choisir un système"/>
        <SelectField label="Classe" value={classId} onChange={(value) => { setClassId(value); setChapterId(''); }} rows={classes} empty="Choisir une classe"/>
        <SelectField label="Matière" value={subjectId} onChange={(value) => { setSubjectId(value); setChapterId(''); }} rows={subjects} empty="Choisir une matière"/>
        {data.series.length > 0 && <label>Série (facultative)<select value={seriesId} onChange={(e) => setSeriesId(e.target.value)}><option value="">Toutes séries</option>{series.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
        {chapters.length > 0 && <label>Chapitre (facultatif)<select value={chapterId} onChange={(e) => setChapterId(e.target.value)}><option value="">Aucun chapitre</option>{chapters.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
        <label>Titre de la contribution<input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}/></label><label>Description courte<textarea maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)}/></label>
        {mode === 'lesson' && <><label>Titre du cours parent<input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)}/></label><label>Description du cours<textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)}/></label><label>Objectifs pédagogiques (un par ligne)<textarea value={objectives} onChange={(e) => setObjectives(e.target.value)}/></label><label>Introduction<textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)}/></label><label>Explications détaillées<textarea rows={7} value={explanation} onChange={(e) => setExplanation(e.target.value)}/></label><label>Définitions (une par ligne)<textarea value={definitions} onChange={(e) => setDefinitions(e.target.value)}/></label><label>Exemples (un par ligne)<textarea value={examples} onChange={(e) => setExamples(e.target.value)}/></label><label>Formules (une par ligne)<textarea value={formulas} onChange={(e) => setFormulas(e.target.value)}/></label><label>Illustrations (URL HTTPS ou descriptif, une par ligne)<textarea value={illustrations} onChange={(e) => setIllustrations(e.target.value)}/></label><label>Exercices proposés (un par ligne; contenu éditorial uniquement)<textarea value={exercises} onChange={(e) => setExercises(e.target.value)}/></label><label>Résumé<textarea value={summary} onChange={(e) => setSummary(e.target.value)}/></label><label>Points importants (un par ligne)<textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)}/></label></>}
        {mode === 'video' && <><label>URL YouTube/Vimeo HTTPS<input type="url" required value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}/></label><label>Miniature HTTPS (facultative)<input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)}/></label><label>Durée en secondes (facultative)<input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)}/></label><p>La vidéo reste hébergée chez son fournisseur; eduschole ne prétend pas l’héberger.</p></>}
        {mode === 'resource' && <><label>Type de ressource<select value={resourceType} onChange={(e) => setResourceType(e.target.value as LearningResourceType)}>{resourceTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label>Fichier privé (PDF, image, document ou audio · 50 MiB maximum)<input type="file" required accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,text/plain" onChange={(e) => setFile(e.target.files?.[0] ?? null)}/></label>{file && <p><FileText size={15}/> {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MiB</p>}</>}
        <button className="phase2-button" disabled={busy}>{busy ? <LoaderCircle className="phase2-spin" size={17}/> : <Check size={17}/>} Créer le brouillon</button>
      </form>
      <section className="learning-admin-panel"><h2>Mes propositions ({data.submissions.length})</h2>{!data.submissions.length ? <LearningEmpty title="Aucune proposition" description="Les brouillons et soumissions Phase 3 apparaîtront ici dès qu’ils seront enregistrés réellement."/> : <div className="learning-admin-list">{data.submissions.map((row) => { const reviews = data.reviews.filter((review) => review.submission_id === row.id); return <article key={row.id} className="learning-admin-content-row"><div><p className="learning-eyebrow">{modeLabel[row.content_type as Mode] ?? row.content_type}</p><strong>{row.title}</strong><p>{row.description || 'Sans description.'}</p><LearningStatus status={row.status}/>{reviews.map((review) => <p className="learning-review-note" key={review.id}>{review.status as ContentReviewStatus} · {new Date(review.created_at).toLocaleDateString('fr-FR')} · {review.note || 'Aucun commentaire de revue.'}</p>)}</div>{(row.status === 'draft' || row.status === 'rejected') && <button className="phase2-button" type="button" disabled={busy} onClick={() => submit(row.id)}><Send size={15}/>{row.status === 'rejected' ? 'Soumettre à nouveau' : 'Soumettre pour examen'}</button>}</article>; })}</div>}</section>
      <p className="phase2-help"><Video size={15}/> Une soumission reste privée et non validée jusqu’à la décision d’un administrateur. Aucun paiement n’est requis pour contribuer.</p>
    </>}
  </LearningPage>;
}
