import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, BookOpenCheck, CalendarDays, CircleHelp, GraduationCap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '../../lib/supabase';

export function StudentDashboard() {
  const { user, profile, studentProfile } = useAuth();
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [levelLabel, setLevelLabel] = useState<string | null>(null);
  const [seriesLabel, setSeriesLabel] = useState<string | null>(null);
  const [systemLabel, setSystemLabel] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client || !user || !studentProfile) return;
    let active = true;
    const loadSchoolDetails = async () => {
      const [classResult, levelResult, systemResult, seriesResult] = await Promise.all([
        client.from('school_classes').select('name').eq('id', studentProfile.class_id).maybeSingle(),
        client.from('school_levels').select('name').eq('id', studentProfile.school_level_id).maybeSingle(),
        client.from('education_systems').select('name').eq('id', studentProfile.education_system_id).maybeSingle(),
        studentProfile.series_id
          ? client.from('school_series').select('name').eq('id', studentProfile.series_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!active) return;
      setClassLabel(classResult.data?.name ?? null);
      setLevelLabel(levelResult.data?.name ?? null);
      setSystemLabel(systemResult.data?.name ?? null);
      setSeriesLabel(seriesResult.data?.name ?? null);
    };
    void loadSchoolDetails();
    return () => { active = false; };
  }, [user, studentProfile]);

  const firstName = profile?.first_name?.trim() || 'Élève';
  const currentDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="dashboard-page">
      <div className="dashboard-date"><CalendarDays size={16} /> {currentDate}</div>
      <section className="dashboard-welcome">
        <div className="welcome-decoration welcome-decoration-one" aria-hidden="true" />
        <div className="welcome-decoration welcome-decoration-two" aria-hidden="true" />
        <div className="welcome-copy"><span className="eyebrow eyebrow-light">TON ESPACE D’APPRENTISSAGE</span><h1>Bonjour, {firstName}.</h1><p>Chaque nouvelle question est un pas vers la compréhension. Ton espace est prêt à grandir avec toi.</p>
          <div className="welcome-class"><span className="welcome-class-icon"><GraduationCap size={17} /></span><span>{classLabel ? <><strong>{classLabel}{seriesLabel ? ` · ${seriesLabel}` : ''}</strong><small>{levelLabel}{systemLabel ? ` · ${systemLabel}` : ''}</small></> : <><strong>Ton parcours étudiant</strong><small>Profil configuré</small></>}</span></div>
        </div>
        <div className="welcome-illustration" aria-hidden="true"><div className="welcome-book"><BookOpenCheck size={54} strokeWidth={1.5} /></div><Sparkles className="welcome-spark welcome-spark-one" size={21} /><Sparkles className="welcome-spark welcome-spark-two" size={15} /><span className="welcome-arc" /></div>
      </section>

      <div className="dashboard-section-heading"><div><span className="eyebrow">TON ESPACE</span><h2>Prêt pour ton prochain chapitre ?</h2></div><span className="empty-state-badge"><span /> Espace en préparation</span></div>

      <section className="dashboard-empty-grid">
        <article className="dashboard-empty-card dashboard-primary-card">
          <span className="dashboard-card-icon"><BookOpen size={22} /></span>
          <span className="dashboard-card-status">Bibliothèque</span>
          <h3>Tes cours apparaîtront ici.</h3>
          <p>Le catalogue de leçons n’est pas encore ouvert. Les cours vérifiés seront ajoutés à la suite des fondations.</p>
          <div className="empty-card-footer"><span>Aucun cours publié pour le moment</span><BookOpenCheck size={16} /></div>
        </article>
        <article className="dashboard-empty-card">
          <span className="dashboard-card-icon icon-soft-yellow"><Sparkles size={21} /></span>
          <span className="dashboard-card-status">Révisions</span>
          <h3>Les exercices arrivent ensuite.</h3>
          <p>Les résultats et recommandations seront affichés quand les exercices seront disponibles.</p>
          <div className="empty-card-footer"><span>Aucune activité à afficher</span><span className="empty-arrow"><ArrowUpRight size={16} /></span></div>
        </article>
      </section>

      <section className="dashboard-honesty-note"><span className="honesty-note-icon"><CircleHelp size={18} /></span><div><strong>Rien n’est inventé dans ton espace.</strong><p>Ta progression apparaîtra ici quand tu auras réellement commencé des leçons ou exercices eduschole.</p></div><Link to="/features" aria-label="Découvrir les prochaines fonctionnalités"><ArrowUpRight size={18} /></Link></section>

      <section className="dashboard-bottom-note"><span className="bottom-note-icon"><Sparkles size={18} /></span><p><strong>Une étape à la fois.</strong> Les espaces famille, enseignant et les outils pédagogiques seront ajoutés après cette première phase.</p></section>
    </div>
  );
}
