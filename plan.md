# EduFlow — Plan projet (Phase 1 livrée, Phase 2 implémentée; intégration live en attente)

## État du projet et objectif

La Phase 1 demeure la base livrée et doit être préservée : site public, parcours Auth Supabase, onboarding et dashboard étudiant, rôles initiaux et migration `20261113200000_phase1_foundation.sql`. L’implémentation Phase 2 ajoute les espaces parent, enseignant et administration avec contrôle d’accès PostgreSQL/Supabase. La livraison ne passe pas aux fonctions pédagogiques de Phase 3 ni aux exercices/examens élèves de Phase 4.

L’existant est dans `/home/ubuntu/eduflow` (React 19, TypeScript, Vite, Tailwind, React Router, Supabase JS). Le serveur de développement est en service sur le port 3000. `runtime/post-edit` confirme les diagnostics TypeScript gérés. Supabase est un service externe demandé dans le cahier des charges; les capacités Database/Server du projet Manus sont désactivées et ne doivent pas être activées en doublon.

**Prérequis constatés :** `webdev.config` n’a actuellement aucun secret déclaré; les variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` et `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED` sont absentes. La migration Phase 1 est livrée mais son application réelle reste à confirmer. Aucune migration Phase 2 ne peut être testée contre une base réelle avant configuration et reconnaissance du projet Supabase cible.

## Périmètre fonctionnel Phase 2

### Espaces parent et association d’enfants

- Ajouter les profils parents, les routes et le tableau de bord parent; permettre plusieurs liens enfants.
- Parcours proposé : l’élève connecté génère un code d’invitation aléatoire, à usage unique et à courte durée de vie; le parent connecté dépose une demande avec ce code; l’élève confirme ou refuse; la liaison n’est active qu’après cette confirmation. Le code brut n’est jamais stocké; le serveur n’en stocke qu’un hash. Une demande en attente ne révèle ni profil ni progression et la suppression d’une liaison révoque les droits immédiatement.
- Le lien prouve le contrôle des deux comptes EduFlow, mais n’est pas présenté comme une vérification juridique de tutelle ou de consentement légal. Ces exigences dépendent des règles applicables et doivent être définies par le propriétaire avant une ouverture publique aux mineurs.
- Le parent ne peut lire des informations d’un élève qu’au moyen d’une liaison active. Fournir les vues des objectifs, progrès et difficultés, rapports période semaine/mois et notifications en appliquant cette même règle côté base.
- Les résultats EduFlow, chapitres terminés, difficultés et progression sont calculés exclusivement à partir d’enregistrements réels. Puisque les cours relèvent de la Phase 3 et le moteur d’exercices/examens de la Phase 4 selon le cahier, les vues afficheront un état vide honnête tant que ces données n’existent pas; aucun résultat d’essai ni système pédagogique ne sera simulé.

### Espace enseignant et contenus à réviser

- Ajouter demande de rôle/validation enseignant, profil, présentation et matières/niveaux déclarés; aucune auto-attribution du rôle `teacher`.
- Permettre des contributions de type proposition de cours, ressource PDF/vidéo et exercice, avec métadonnées et fichiers dans un espace Supabase Storage privé. Les propositions d’exercice sont des dépôts éditoriaux uniquement : pas de moteur élève ni de correction.
- Cycle contrôlé en base et visible à l’enseignant : `draft` (brouillon) → `submitted` (soumis) → `in_review` (en examen) → `approved` (approuvé) ou `rejected` (refusé), avec retours de revue. Seul un admin peut examiner ou approuver. Une approbation de contribution ne crée ni ne publie un module pédagogique élève de Phase 3/4.
- Statistiques fondées sur ses propres nombres réels (brouillons, soumissions, états); contribution gratuite, aucun abonnement ni paiement implémenté.

### Administration

- Routes et tableau de bord admin avec agrégats issus de la base, liste des utilisateurs, étudiants, parents et enseignants, demandes de rôle, revue/validation enseignants et contributions, notifications in-app et journal append-only des actions.
- Les mutations privilégiées passent par des RPC PostgreSQL `SECURITY DEFINER` limitées ou fonctions serveur vérifiant l’utilisateur appelant et son rôle `admin`; pas par de simples contrôles React ou des requêtes directes permissives.
- Aucun compte admin ne sera créé par une inscription ou un champ public. Le premier admin doit être désigné par le propriétaire depuis un canal Supabase administrateur/SQL de confiance. Les écrans peuvent être codés avant cette action, mais l’admin réel et le test admin demandent un bootstrap manuel.
- L’administration de matières détaillées, le CMS de leçons, les examens, paiements, réglages IA et statistiques de revenus restent hors Phase 2.

### Notifications et rapports

- Créer un centre in-app et des préférences. Les événements de comptes/liaisons, revue de contributions et annonces admin utilisent les destinataires explicitement autorisés; l’utilisateur ne lit et ne marque comme lue que sa propre notification, l’admin ne voit que les fonctions de gestion prévues.
- Les bilans parentaux sont consultables pour une période hebdomadaire ou mensuelle et ne contiennent que les données réelles du ou des enfants liés. Dans ce plan, génération à la demande et notifications in-app uniquement; aucun envoi planifié par email/push ou tâche serveur n’est déclaré opérationnel (le cahier reporte ces canaux ultérieurement).

## Architecture de données et autorisation

La migration Phase 2 versionnée `supabase/migrations/20261114120000_phase2_user_spaces.sql` ajoute, sans effacer ni réécrire les lignes Phase 1, les tables `role_applications`, `parent_profiles`, `teacher_profiles`, `parent_invite_codes`, `parent_link_requests`, `parent_student_links`, `learning_goals`, `learning_activity`, `content_submissions`, `content_reviews`, `notifications`, `notification_preferences` et `admin_audit_logs`. Les matières/niveaux déclarés sont conservés sous forme de tableaux dans les profils et contributions, sans table `teacher_subjects`. Les types, contraintes, clés étrangères, index, états, RPC et chemins Storage sont versionnés. `learning_activity` est en lecture seule pour les clients et sert aux vues familiales; aucun événement pédagogique de démonstration n’est inséré.

- Activer RLS sur chaque nouvelle table privée et appliquer des permissions minimales; le bucket enseignant reste privé avec contrôle d’accès par propriétaire et admin.
- Les helpers vérifient rôle et liaison acceptée sans récursion RLS. Le client ne reçoit jamais `service_role` ni ne peut insérer un rôle, accepter sa propre demande d’enseignant, changer un contenu en approuvé, écrire un audit ou lire les enfants d’un autre parent.
- Préserver les rôles multiples possibles : remplacer l’hypothèse d’un seul rôle dans `AuthContext` par une liste de rôles, et protéger chaque route par inclusion explicite du rôle requis; les guards restent un confort UX, RLS/RPC sont l’autorité.
- Prévoir révocation d’une association, refus/expiration/rejeu impossible d’un code, absence d’énumération des élèves, accès minimal aux identifiants et journalisation des décisions admin sans dupliquer les données sensibles.

## Routes et structure

Préserver les routes publiques et étudiantes déjà livrées. Routes Phase 2 réellement présentes : `/access-request`, `/student/parent-links`, `/parent/dashboard`, `/parent/children`, `/parent/progress`, `/parent/results`, `/parent/notifications`, `/parent/profile`, `/teacher/dashboard`, `/teacher/profile`, `/teacher/contributions`, `/teacher/courses`, `/teacher/resources`, `/teacher/statistics`, `/admin`, `/admin/users`, `/admin/students`, `/admin/parents`, `/admin/teachers`, `/admin/contributions`, `/admin/notifications`, `/admin/audit`. Les routes d’espace sont protégées par rôle dans le routeur et par RLS/RPC dans Supabase. `public/manus-routes.json` déclare toutes les pages réellement implémentées, sans route de 404.

```text
src/
  app/                         # AuthContext, guards, routes et route manifest consommé
  features/
    access/                    # demande parent/enseignant, sans voie publique admin
    parents/                   # code enfant, confirmation, progrès, résultats, objectifs, notifications
    teachers/                  # profil, dépôts, cours/ressources, statuts et statistiques
    administration/            # utilisateurs, demandes, revue, notifications et audit
  layouts/                     # shells responsive rôle par rôle, bascule et déconnexion
  lib/                         # client Supabase, validation et tests statiques de migration
  types/                       # rôles multiples, tables et RPC Supabase typés
  styles.css                   # tokens communs et styles mobile-first
supabase/
  migrations/                  # migrations versionnées, additives, non appliquées
```

Réutiliser le logo, la palette et les motifs de Phase 1. Les shells de chaque rôle doivent rester responsives, les navigations inutiles masquées par espace. Ne pas ajouter de graphiques ou compteurs sans données.

## Dépendances, sûreté et limite d’exécution

Le front-end actuel reste en React/Vite; `@supabase/supabase-js` et les tests sont déjà installés. Utiliser Supabase Auth, PostgreSQL/RLS et Storage au lieu d’activer les services Manus désactivés. Ne demander aucun secret dans le chat; les clés publiables doivent être saisies par la configuration protégée, et aucune clé secrète/service-role n’est nécessaire dans le frontend.

La migration Phase 2 est livrée et contrôlée statiquement, mais n’a pas été appliquée : aucune instance Supabase n’était configurée et aucune ligne de production/dev n’a été modifiée. Les paramètres `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ainsi que les comptes de rôles sont requis pour les tests Auth/RLS live; ces vérifications restent bloquées et ne sont pas simulées. Aucun déploiement public, email/push ou tâche planifiée n’est configuré. Les moteurs élève de cours/leçons/exercices/examens, EduAI, abonnements/paiements et progression artificielle restent hors Phase 2.

## Direction visuelle conservée de Phase 1

Identité éducative numérique rassurante, lumineuse et contemporaine, issue du logo fourni. Palette : bleu nuit `#172554`, bleu EduFlow `#2563EB`, jaune `#FBBF24`, vert `#16A34A`, blanc et gris `#F1F5F9`. Principes : mobile d’abord, lecture claire, confiance/sobriété, langage pédagogique précis, états vides honnêtes. Réutiliser les cartes arrondies, ombres discrètes et accents en courbes/rubans de progression; animations courtes respectueuses de `prefers-reduced-motion`; police Inter ou système équivalent. Voix encourageante et directe. Aucun symbole ou nom de pays dans l’identité.
