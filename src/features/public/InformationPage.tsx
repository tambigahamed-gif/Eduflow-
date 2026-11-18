import { ArrowRight, ChevronRight, CircleHelp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type InfoPage = 'about' | 'features' | 'pricing' | 'faq' | 'contact' | 'privacy' | 'terms';

const pageMeta: Record<InfoPage, { eyebrow: string; title: string; intro: string }> = {
  about: { eyebrow: 'NOTRE VISION', title: 'Une meilleure façon d’apprendre commence par comprendre.', intro: 'eduschole se construit comme un environnement d’apprentissage complet, accessible et rassurant, où l’élève progresse à son rythme.' },
  features: { eyebrow: 'LA PLATEFORME', title: 'Des outils pour apprendre avec intention.', intro: 'La plateforme est développée par étapes. Voici ce qui est déjà en fondation et ce qui reste à construire.' },
  pricing: { eyebrow: 'OFFRES ENVISAGÉES', title: 'Des tarifs simples, pensés pour rester accessibles.', intro: 'Les prix ci-dessous sont des propositions du cahier des charges, pas une offre commerciale activée. Aucun paiement n’est disponible dans cette phase.' },
  faq: { eyebrow: 'QUESTIONS FRÉQUENTES', title: 'Les réponses, sans détour.', intro: 'Les fonctionnalités s’ouvrent progressivement. Voici l’état réel de la Phase 1.' },
  contact: { eyebrow: 'NOUS JOINDRE', title: 'eduschole se construit avec attention.', intro: 'Le canal de support client n’est pas encore configuré. Nous n’affichons pas d’adresse de contact qui n’a pas été validée.' },
  privacy: { eyebrow: 'VIE PRIVÉE', title: 'Tes informations méritent une attention particulière.', intro: 'Document de pré-lancement — cette notice doit être complétée et vérifiée avant toute ouverture publique aux élèves.' },
  terms: { eyebrow: 'CONDITIONS', title: 'Des règles claires pour un espace de confiance.', intro: 'Document de pré-lancement — ces conditions doivent faire l’objet d’une revue juridique et d’une validation avant lancement public.' },
};

const faq = [
  { question: 'eduschole est-il déjà ouvert aux élèves ?', answer: 'Les fondations du site sont en cours. La création de comptes dépend de la configuration du projet Supabase et de l’application des migrations. Les cours et les activités ne sont pas encore disponibles.' },
  { question: 'Comment choisir mon niveau et ma classe ?', answer: 'Après configuration de Supabase et vérification de ton email, l’onboarding recueille ton niveau, ta classe et, lorsque le niveau le permet, une série du référentiel initial. Cette structure ne certifie pas un programme officiel.' },
  { question: 'L’assistant EduAI est-il actif ?', answer: 'Non. EduAI fait partie de la vision produit, mais n’est pas développé dans cette Phase 1. Aucune réponse générée par IA n’est proposée dans l’application actuelle.' },
  { question: 'Puis-je suivre les progrès de mon enfant ?', answer: 'L’espace parent et l’association parent-enfant sont prévus dans une phase ultérieure. Ils ne sont pas actifs à ce stade.' },
  { question: 'Les abonnements Premium et paiements fonctionnent-ils ?', answer: 'Non. Les montants mensuel et annuel figurant dans le cahier des charges restent indicatifs. Aucun abonnement ni moyen de paiement n’est activé.' },
  { question: 'Puis-je me connecter avec Google ?', answer: 'Seulement si le propriétaire configure le fournisseur Google dans Supabase Auth, renseigne les URL autorisées et active l’option prévue; le bouton reste caché par défaut.' },
];

const futureFeatures = [
  { label: 'Fondations Phase 1', state: 'En développement', description: 'Site responsive, création de compte, profil étudiant, onboarding et tableau de bord de départ.' },
  { label: 'Système pédagogique', state: 'Phase suivante', description: 'Cours, matières, ressources, exercices, examens blancs et progression.' },
  { label: 'Accompagnement', state: 'À planifier', description: 'EduAI, suivi parental, espace enseignant et administration des contenus.' },
];

function DocumentWarning() {
  return <div className="document-warning"><ShieldCheck size={18} /><p><strong>À valider avant le lancement public.</strong> Ce document décrit l’intention de confidentialité eduschole; il ne remplace pas une politique finalisée, une analyse des obligations applicables ni l’avis d’un professionnel.</p></div>;
}

export function InformationPage({ page }: { page: InfoPage }) {
  const meta = pageMeta[page];
  return (
    <div className="info-page page-wrap">
      <header className="info-hero"><span className="eyebrow">{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.intro}</p></header>

      {page === 'about' && <section className="info-section about-grid">
        <article><span className="eyebrow">POURQUOI EDUSCHOLE</span><h2>Apprendre, ce n’est pas seulement consulter.</h2><p>Un apprentissage durable demande des explications accessibles, de la pratique et des repères pour progresser. eduschole réunit ces besoins dans une vision cohérente.</p></article>
        <article className="info-highlight"><span className="info-highlight-icon"><CircleHelp size={22} /></span><h3>Comprendre d’abord.</h3><p>Des parcours pensés autour de la compréhension, de la confiance et de l’autonomie.</p></article>
        <article className="info-highlight info-highlight-blue"><span className="info-highlight-icon"><ShieldCheck size={22} /></span><h3>Protéger le parcours.</h3><p>Les rôles, l’accès aux données et la place des familles sont conçus avec prudence.</p></article>
        <article><span className="eyebrow">UNE MARQUE OUVERTE</span><h2>Un projet international, ancré dans le réel.</h2><p>Le lancement est prévu au Burkina Faso, avec une structure technique destinée à accueillir d’autres systèmes éducatifs francophones. Aucun contenu n’est présenté comme officiel sans source vérifiée.</p></article>
      </section>}

      {page === 'features' && <section className="info-section roadmap-list">
        {futureFeatures.map((feature, index) => <article className="roadmap-row" key={feature.label}><span className="roadmap-index">0{index + 1}</span><div><span className="roadmap-state">{feature.state}</span><h2>{feature.label}</h2><p>{feature.description}</p></div><ChevronRight size={20} /></article>)}
        <p className="notice-inline">Seules les fonctions de Phase 1 sont en cours d’implémentation. Une fonctionnalité non disponible n’est ni simulée ni présentée comme active.</p>
      </section>}

      {page === 'pricing' && <section className="info-section pricing-grid">
        <article className="pricing-card"><span className="pricing-plan">FREE</span><h2>0 <small>FCFA</small></h2><p className="pricing-description">L’accès essentiel, envisagé comme gratuit.</p><ul><li>Inscription gratuite</li><li>Cours et exercices essentiels (à venir)</li><li>Accès EduAI limité (à venir)</li><li>Progression de base (à venir)</li></ul><Link className="button button-outline button-wide" to="/register">Préparer mon espace <ArrowRight size={16} /></Link><small className="pricing-status">Création de compte soumise à la configuration Supabase.</small></article>
        <article className="pricing-card pricing-card-premium"><span className="pricing-badge">Proposition · non activée</span><span className="pricing-plan">PREMIUM MENSUEL</span><h2>1 500 <small>FCFA / mois</small></h2><p className="pricing-description">Prix indicatif fourni dans le cahier des charges; offre non commercialisée.</p><ul><li>Accès EduAI élargi (prévu)</li><li>Ressources et vidéos Premium (prévues)</li><li>Examens blancs supplémentaires (prévus)</li><li>Suivi détaillé (prévu)</li></ul><button className="button button-disabled button-wide" type="button" disabled>Non disponible en Phase 1</button><small className="pricing-status">Aucun paiement ni abonnement n’est activé.</small></article>
        <article className="pricing-card"><span className="pricing-plan">PREMIUM ANNUEL</span><h2>15 000 <small>FCFA / an</small></h2><p className="pricing-description">Proposition annuelle indicative, configurable ultérieurement.</p><ul><li>Tarifs à confirmer par l’administration</li><li>Suivi parental essentiel prévu gratuit</li><li>Contribution enseignante prévue gratuite au lancement</li></ul><button className="button button-disabled button-wide" type="button" disabled>Non disponible en Phase 1</button><small className="pricing-status">Prix à valider avant toute mise en vente.</small></article>
      </section>}

      {page === 'faq' && <section className="info-section faq-list">
        {faq.map((item) => <details key={item.question} className="faq-item"><summary>{item.question}<ChevronRight size={18} /></summary><p>{item.answer}</p></details>)}
      </section>}

      {page === 'contact' && <section className="info-section contact-card"><span className="contact-icon"><CircleHelp size={22} /></span><h2>Le canal de contact sera annoncé ici.</h2><p>Le produit est actuellement en développement. Aucun formulaire ne transmet de message et aucun email de support n’a encore été publié. Pour une question sur un compte de test, contacte l’équipe qui t’a invité à tester eduschole.</p><Link to="/faq" className="text-link">Consulter les réponses fréquentes <ArrowRight size={16} /></Link></section>}

      {page === 'privacy' && <section className="info-section legal-document"><DocumentWarning /><h2>Données traitées dans la Phase 1</h2><p>Le parcours est conçu pour traiter une adresse email via Supabase Auth, un prénom, un nom, un rôle initial étudiant et les informations de niveau, classe et série saisies pour l’onboarding. Le site actuel ne collecte pas de conversation IA, de résultat scolaire, de paiement ou de suivi d’activité pédagogique.</p><h2>Accès et sécurité</h2><p>Les profils sont destinés à être protégés par les politiques RLS de Supabase; chaque étudiant ne doit accéder qu’à ses propres données. Les rôles parent, enseignant et administration n’ont pas encore d’espace actif.</p><h2>À compléter par le propriétaire avant lancement</h2><ul><li>Identité juridique de l’éditeur et coordonnées vérifiées.</li><li>Base légale et consentement adapté aux mineurs et à leurs représentants.</li><li>Région d’hébergement Supabase, sous-traitants, durée de conservation et procédure de suppression/export.</li><li>Adresse de contact pour les demandes d’accès, correction et suppression.</li><li>Revue des obligations applicables dans chaque pays d’exploitation.</li></ul><p>Cette page est un brouillon informatif, pas une garantie de conformité. L’inscription publique ne doit pas être ouverte à des élèves avant cette revue.</p></section>}

      {page === 'terms' && <section className="info-section legal-document"><DocumentWarning /><h2>État du service</h2><p>eduschole est en phase de fondations. Les cours, exercices, examens, assistance IA, espaces parent et enseignant ainsi que les abonnements ne sont pas proposés par la présente version.</p><h2>Compte et usage</h2><p>Après configuration et lancement autorisé, les utilisateurs devront fournir des informations exactes, préserver leurs moyens d’accès et respecter les droits d’auteur et les autres utilisateurs. L’inscription publique crée un compte étudiant; elle ne confère aucun rôle administratif.</p><h2>Contenus et résultats</h2><p>Aucun contenu affiché dans les pages de présentation ne constitue une note officielle ni un programme scolaire officiel. Aucun résultat n’est créé ou affiché dans la Phase 1.</p><h2>À valider avant ouverture</h2><p>Les règles d’âge, de consentement parental, de modération, de propriété intellectuelle, de responsabilité, de résiliation, de droit applicable et de règlement des litiges doivent être complétées par le propriétaire et examinées avant tout lancement public.</p></section>}

      {['about', 'features', 'faq'].includes(page) && <section className="info-bottom-cta"><span className="eyebrow">LE PROCHAIN PAS</span><h2>Prépare ton espace eduschole.</h2><p>Les nouvelles fonctionnalités seront mises en service progressivement.</p><Link className="button button-primary" to="/register">Créer un compte étudiant <ArrowRight size={16} /></Link></section>}
    </div>
  );
}
