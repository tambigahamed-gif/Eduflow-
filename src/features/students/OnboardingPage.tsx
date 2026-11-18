import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, CheckCircle2, GraduationCap, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '../../lib/supabase';

export function OnboardingPage() {
  const { user, profile, refreshAccount } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string; category: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; school_level_id: string }[]>([]);
  const [series, setSeries] = useState<{ id: string; code: string; name: string }[]>([]);
  const [systemId, setSystemId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [classId, setClassId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const loadSystems = async () => {
      const { data, error } = await client
        .from('education_systems')
        .select('id,name')
        .eq('is_active', true)
        .order('name');
      if (!active) return;
      if (error) {
        setErrorMessage('Le référentiel scolaire n’est pas prêt. Vérifie que la migration eduschole a été appliquée dans Supabase.');
      } else {
        const rows = data ?? [];
        setSystems(rows);
        if (rows.length > 0) setSystemId((current) => current || rows[0].id);
        if (rows.length === 0) setErrorMessage('Aucun système éducatif actif n’est configuré.');
      }
      setLoadingCatalog(false);
    };
    void loadSystems();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !systemId) return;
    let active = true;
    const loadSystemTaxonomy = async () => {
      const [levelResult, seriesResult] = await Promise.all([
        client.from('school_levels').select('id,name,category').eq('education_system_id', systemId).eq('is_active', true).order('sort_order'),
        client.from('school_series').select('id,code,name').eq('education_system_id', systemId).eq('is_active', true).order('code'),
      ]);
      if (!active) return;
      if (levelResult.error || seriesResult.error) {
        setErrorMessage('Les choix scolaires ne peuvent pas être chargés. Vérifie le référentiel et les policies RLS Supabase.');
        return;
      }
      setLevels(levelResult.data ?? []);
      setSeries(seriesResult.data ?? []);
    };
    void loadSystemTaxonomy();
    return () => { active = false; };
  }, [systemId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !levelId) return;
    let active = true;
    const loadClasses = async () => {
      const { data, error } = await client
        .from('school_classes')
        .select('id,name,school_level_id')
        .eq('school_level_id', levelId)
        .eq('is_active', true)
        .order('sort_order');
      if (!active) return;
      if (error) {
        setErrorMessage('Les classes ne peuvent pas être chargées. Vérifie les politiques RLS du référentiel.');
        return;
      }
      setClasses(data ?? []);
    };
    void loadClasses();
    return () => { active = false; };
  }, [levelId]);

  const selectedLevel = levels.find((level) => level.id === levelId);
  const showSeries = selectedLevel?.category === 'secondary' && series.length > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const client = supabase;
    if (!user || !client) return;
    if (!firstName.trim() || !lastName.trim() || !systemId || !levelId || !classId) {
      setErrorMessage('Complète ton prénom, ton nom, ton niveau et ta classe pour continuer.');
      return;
    }
    setSaving(true);
    const { error: profileError } = await client
      .from('profiles')
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq('user_id', user.id);
    if (profileError) {
      setSaving(false);
      setErrorMessage('Ton nom ne peut pas être enregistré. Vérifie la migration et les permissions de ton profil.');
      return;
    }
    const { error: studentError } = await client.from('student_profiles').upsert({
      user_id: user.id,
      education_system_id: systemId,
      school_level_id: levelId,
      class_id: classId,
      series_id: showSeries && seriesId ? seriesId : null,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (studentError) {
      setErrorMessage('Ton parcours scolaire n’a pas pu être enregistré. Vérifie les choix et les policies RLS.');
      return;
    }
    await refreshAccount();
    navigate('/dashboard', { replace: true });
  };

  return (
    <section className="onboarding-page">
      <div className="onboarding-progress"><span className="progress-step progress-step-complete"><CheckCircle2 size={16} /> Compte créé</span><span className="progress-line" /><span className="progress-step progress-step-current"><span>2</span> Ton parcours</span></div>
      <div className="onboarding-card">
        <div className="onboarding-heading"><span className="onboarding-icon"><GraduationCap size={24} /></span><span className="eyebrow">TON ESPACE PERSONNEL</span><h1>Parlons de ton parcours.</h1><p>Quelques informations pour adapter ton espace. Tu pourras les modifier plus tard.</p></div>
        {errorMessage && <div className="form-message form-message-error" role="alert"><span className="message-dot" />{errorMessage}</div>}
        {loadingCatalog ? <div className="catalog-loading"><LoaderCircle size={18} className="spin-icon" /> Chargement du référentiel…</div> : systems.length === 0 ? <div className="catalog-empty"><BookOpenCheck size={23} /><p>Le référentiel scolaire sera disponible après configuration de Supabase.</p></div> :
          <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
            <div className="form-row-two">
              <label className="form-field"><span>Prénom</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" maxLength={80} required /></label>
              <label className="form-field"><span>Nom</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" maxLength={80} required /></label>
            </div>
            <label className="form-field"><span>Système éducatif</span><select value={systemId} onChange={(event) => { setSystemId(event.target.value); setLevelId(''); setClassId(''); setSeriesId(''); }} required><option value="">Choisir un système</option>{systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
            <label className="form-field"><span>Niveau</span><select value={levelId} onChange={(event) => { setLevelId(event.target.value); setClassId(''); setSeriesId(''); }} required><option value="">Choisir un niveau</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
            <label className="form-field"><span>Classe</span><select value={classId} onChange={(event) => setClassId(event.target.value)} required disabled={!levelId}><option value="">{levelId ? 'Choisir une classe' : 'Choisis d’abord ton niveau'}</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label>
            {showSeries && <label className="form-field"><span>Série <small>(si applicable)</small></span><select value={seriesId} onChange={(event) => setSeriesId(event.target.value)}><option value="">Aucune série / pas encore déterminée</option>{series.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <p className="onboarding-privacy"><CheckCircle2 size={15} /> Ces informations servent à adapter ton espace et restent liées à ton compte.</p>
            <button className="button button-primary button-wide" type="submit" disabled={saving || !supabase}>{saving ? 'Enregistrement…' : 'Continuer vers mon espace'} <ArrowRight size={17} /></button>
          </form>}
        <p className="onboarding-footnote">Les programmes et contenus scolaires officiels ne sont pas inclus dans ce référentiel de départ.</p>
      </div>
    </section>
  );
}
