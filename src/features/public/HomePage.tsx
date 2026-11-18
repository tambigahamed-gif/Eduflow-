import { ArrowRight, BookOpenCheck, Check, ChevronRight, GraduationCap, Lightbulb, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EDUSCHOLE_LOGO_SRC } from '../../components/Brand';

const foundations = [
  { icon: BookOpenCheck, title: 'Des cours qui prennent sens', text: 'Des leçons structurées pour comprendre les notions, pas seulement parcourir des documents.', state: 'En préparation' },
  { icon: Lightbulb, title: 'Des explications à ton rythme', text: 'Un accompagnement pédagogique adapté à ton niveau et à tes objectifs.', state: 'EduAI · prévu' },
  { icon: ShieldCheck, title: 'Un progrès suivi avec confiance', text: 'Un espace pensé pour l’élève et, ensuite, pour les familles qui l’accompagnent.', state: 'Fondations en cours' },
];

const schoolStages = [
  { title: 'Primaire', label: 'CP1 à CM2', number: '01', className: 'stage-primary' },
  { title: 'Collège', label: '6e à 3e', number: '02', className: 'stage-middle' },
  { title: 'Lycée', label: '2nde à Terminale', number: '03', className: 'stage-secondary' },
];

const homeFaq = [
  { question: 'eduschole est-il déjà ouvert aux élèves ?', answer: 'Les fondations du site sont en cours. L’inscription dépend encore de la configuration Supabase; les cours et activités pédagogiques ne sont pas disponibles dans cette Phase 1.' },
  { question: 'EduAI et les cours sont-ils déjà actifs ?', answer: 'Non. Les cours vérifiés et EduAI appartiennent à la vision du produit, mais ne sont pas encore proposés par cette version.' },
  { question: 'Les parents et les enseignants ont-ils leur espace ?', answer: 'Ces espaces sont prévus après les fondations. Aucun suivi familial ni outil enseignant n’est actif aujourd’hui.' },
  { question: 'Les tarifs Premium correspondent-ils à une offre en vente ?', answer: 'Non. Les montants affichés sont des propositions indicatives du cahier des charges. Aucun abonnement ni paiement n’est activé.' },
];

export function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-bg-orb hero-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-orb-b" aria-hidden="true" />
        <div className="hero-inner page-wrap">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> L’apprentissage, avec plus de clarté</span>
            <h1>Comprendre aujourd’hui.<br /><span>Réussir demain.</span></h1>
            <p className="hero-lead">eduschole réunit dans un même espace ce qu’il faut pour apprendre avec méthode, reprendre confiance et avancer à son rythme.</p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" to="/register">Créer mon espace <ArrowRight size={17} /></Link>
              <Link className="text-link" to="/features">Découvrir eduschole <ChevronRight size={17} /></Link>
            </div>
            <div className="hero-assurance"><ShieldCheck size={17} /><span>Une plateforme conçue avec attention pour les élèves et leurs familles.</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-glow" aria-hidden="true" />
            <div className="hero-logo-card">
              <div className="hero-logo-topline"><span className="live-indicator" /> Une nouvelle façon d’apprendre</div>
              <img src={EDUSCHOLE_LOGO_SRC} alt="Logo eduschole — Apprendre • Progresser • Réussir" />
              <div className="hero-card-foot"><span className="hero-foot-icon"><GraduationCap size={19} /></span><span><strong>Chaque élève a son rythme.</strong><small>eduschole grandit étape par étape.</small></span><Sparkles size={19} className="hero-foot-spark" /></div>
            </div>
            <div className="float-note float-note-top"><span className="float-note-icon note-blue"><BookOpenCheck size={17} /></span><span><strong>Apprendre</strong><small>avec intention</small></span></div>
            <div className="float-note float-note-bottom"><span className="float-note-icon note-yellow"><Lightbulb size={17} /></span><span><strong>Comprendre</strong><small>à son rythme</small></span></div>
            <div className="visual-dot visual-dot-one" aria-hidden="true" /><div className="visual-dot visual-dot-two" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-bottom-line page-wrap"><span>Un espace pour apprendre avec confiance</span><span>eduschole · Apprendre • Progresser • Réussir</span></div>
      </section>

      <section className="intro-section page-wrap section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">LA VISION EDUSCHOLE</span><h2>Tout commence par<br /><span>une notion comprise.</span></h2></div>
          <p>Apprendre ne devrait pas se résumer à accumuler des pages. eduschole est pensé comme un environnement d’apprentissage vivant : des ressources claires, de la pratique et un accompagnement qui s’adapte à l’élève.</p>
        </div>
        <div className="foundation-cards">
          {foundations.map(({ icon: Icon, title, text, state }, index) => (
            <article className={`foundation-card foundation-card-${index + 1}`} key={title}>
              <span className="foundation-icon"><Icon size={21} /></span>
              <span className="foundation-state">{state}</span>
              <h3>{title}</h3><p>{text}</p>
              <span className="card-number">0{index + 1}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="roadmap-strip">
        <div className="page-wrap roadmap-inner">
          <span className="roadmap-icon"><Sparkles size={20} /></span>
          <div><span className="eyebrow eyebrow-light">CONSTRUIT AVEC SOIN</span><h2>Les fondations sont en place. L’apprentissage se construit ensuite.</h2></div>
          <p>Le premier espace élève arrive en priorité. Les cours, l’assistant pédagogique et les espaces familles seront ouverts au fil des phases de développement.</p>
          <Link to="/features" className="roadmap-link">Voir la feuille de route <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="levels-section page-wrap section-pad">
        <div className="section-heading-centered"><span className="eyebrow">POUR CHAQUE ÉTAPE DU PARCOURS</span><h2>Grandir, apprendre,<br /><span>progresser.</span></h2><p>Une structure scolaire flexible pour accompagner différents niveaux et systèmes éducatifs.</p></div>
        <div className="stage-cards">
          {schoolStages.map((stage) => <article className={`stage-card ${stage.className}`} key={stage.title}>
            <span className="stage-number">{stage.number}</span><span className="stage-icon"><GraduationCap size={23} /></span><h3>{stage.title}</h3><p>{stage.label}</p><span className="stage-status">Référentiel initial configuré</span>
          </article>)}
        </div>
        <p className="levels-disclaimer">Les classes affichées décrivent le référentiel de départ. Les programmes et contenus officiels ne seront publiés qu’après vérification de leurs sources.</p>
      </section>

      <section className="family-section page-wrap">
        <div className="family-art" aria-hidden="true">
          <div className="family-art-ring ring-one" /><div className="family-art-ring ring-two" />
          <div className="family-note family-note-one"><span><Users size={18} /></span><strong>Élèves</strong><small>Au cœur de l’expérience</small></div>
          <div className="family-note family-note-two"><span><ShieldCheck size={18} /></span><strong>Familles</strong><small>À leurs côtés, bientôt</small></div>
          <div className="family-center"><BookOpenCheck size={42} /><span>eduschole</span></div>
        </div>
        <div className="family-copy"><span className="eyebrow">UN ENVIRONNEMENT, PLUSIEURS REGARDS</span><h2>L’élève avance.<br /><span>Son entourage l’accompagne.</span></h2><p>eduschole prévoit une place pour les parents et les enseignants, tout en gardant le parcours de l’élève au centre. Ces espaces seront déployés après les fondations de la plateforme.</p><Link className="text-link" to="/about">Lire notre vision <ChevronRight size={17} /></Link></div>
      </section>

      <section className="home-pricing page-wrap section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">TARIFS PROPOSÉS</span><h2>Un accès simple,<br /><span>pour avancer.</span></h2></div>
          <p>Les montants ci-dessous viennent du cahier des charges. Ce sont des propositions indicatives : aucune offre Premium ni aucun paiement ne sont activés en Phase 1.</p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card"><span className="pricing-plan">FREE</span><h2>0 <small>FCFA</small></h2><p className="pricing-description">L’accès essentiel, envisagé comme gratuit.</p><ul><li>Inscription gratuite</li><li>Cours essentiels (à venir)</li><li>Exercices de base (à venir)</li><li>Progression de base (à venir)</li></ul><Link className="button button-outline button-wide" to="/register">Préparer mon espace <ArrowRight size={16} /></Link><small className="pricing-status">Inscription soumise à la configuration Supabase.</small></article>
          <article className="pricing-card pricing-card-premium"><span className="pricing-badge">Proposition · non activée</span><span className="pricing-plan">PREMIUM MENSUEL</span><h2>1 500 <small>FCFA / mois</small></h2><p className="pricing-description">Prix indicatif, non commercialisé.</p><ul><li>EduAI élargi (prévu)</li><li>Ressources Premium (prévues)</li><li>Examens blancs (prévus)</li><li>Suivi détaillé (prévu)</li></ul><button className="button button-disabled button-wide" type="button" disabled>Non disponible en Phase 1</button><small className="pricing-status">Aucun paiement ni abonnement actif.</small></article>
          <article className="pricing-card"><span className="pricing-plan">PREMIUM ANNUEL</span><h2>15 000 <small>FCFA / an</small></h2><p className="pricing-description">Proposition indicative, à confirmer.</p><ul><li>Offre à configurer ultérieurement</li><li>Suivi parental essentiel prévu gratuit</li><li>Contribution enseignante prévue gratuite</li></ul><button className="button button-disabled button-wide" type="button" disabled>Non disponible en Phase 1</button><small className="pricing-status">Prix à valider avant toute mise en vente.</small></article>
        </div>
        <p className="levels-disclaimer">Les prix et offres devront être validés et configurés avant tout lancement commercial.</p>
      </section>

      <section className="home-faq page-wrap section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">QUESTIONS FRÉQUENTES</span><h2>Des réponses<br /><span>sans détour.</span></h2></div>
          <p>eduschole se construit par étapes. Nous distinguons clairement ce qui existe aujourd’hui de ce qui reste à développer.</p>
        </div>
        <div className="faq-list">
          {homeFaq.map((item) => <details key={item.question} className="faq-item"><summary>{item.question}<ChevronRight size={18} /></summary><p>{item.answer}</p></details>)}
        </div>
      </section>

      <section className="final-cta-section">
        <div className="page-wrap final-cta">
          <span className="final-cta-spark"><Sparkles size={22} /></span>
          <span className="eyebrow eyebrow-light">LE PREMIER PAS COMMENCE ICI</span>
          <h2>Prêt à faire de la place<br />à la compréhension ?</h2>
          <p>Crée ton compte étudiant pour préparer ton espace eduschole.</p>
          <Link className="button button-yellow button-large" to="/register">Commencer mon inscription <ArrowRight size={17} /></Link>
          <div className="final-cta-checks"><span><Check size={15} /> Inscription gratuite</span><span><Check size={15} /> Compte étudiant privé</span></div>
        </div>
      </section>
    </>
  );
}
