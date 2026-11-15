# EduFlow — Rapport de livraison Phase 2

**Date :** 15 novembre 2026
**Périmètre :** espaces parent, enseignant et administration uniquement. Les fonctionnalités pédagogiques de Phase 3 n’ont pas été commencées.

## Résumé exécutif

Le code de Phase 2 est intégré au projet EduFlow en conservant la Phase 1. Les trois espaces, le parcours de liaison, les soumissions et revues, les interfaces admin, une migration additive RLS/Storage et des tests statiques sont présents.

**La Phase 2 n’est pas encore validée en bout en bout sur Supabase.** La configuration WebDev ne contient aucun secret et les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont absentes. Par prudence, aucune migration n’a été exécutée et aucune base ni donnée utilisateur n’a été modifiée. Les accès Auth, les politiques RLS, le Storage réel et les actions par rôle ne peuvent donc pas être présentés comme opérationnels en environnement live. La configuration Supabase et des comptes de test par rôle sont requis pour terminer cette vérification.

Aucun déploiement public n’a été lancé; `auto_publish` est désactivé. La Phase 3 attend la validation de l’utilisateur.

## Développé

### Parent

- Dashboard avec liste des enfants disposant d’une liaison active; la demande en attente ne révèle pas le profil ni la progression.
- Code d’invitation à usage unique généré par l’élève, demande envoyée par un compte parent, puis acceptation/refus explicite de l’élève. Le code brut n’est pas stocké dans la base; l’expiration, le hachage, l’usage unique, l’acceptation et la révocation sont traités par les RPC SQL.
- Pages enfants/liens, progrès et objectifs, résultats, notifications et profil.
- Les objectifs peuvent être créés pour un enfant lié; les activités viennent exclusivement de `learning_activity`, sans données pédagogiques de démonstration. Les totaux utilisent des comptes exacts Supabase; les vues marquent explicitement la limite de 200 résultats (tous temps) ou 500 activités (rapport hebdomadaire/mensuel) lorsqu’elles n’affichent que les lignes les plus récentes.
- Rapport hebdomadaire (7 derniers jours) ou mensuel (mois en cours) consultable à la demande. Aucun envoi planifié par email/push n’est configuré.
- La liaison contrôle les deux comptes EduFlow, pas la qualité juridique de tuteur; cette limite est indiquée dans l’interface et la documentation.

### Enseignant

- Demande de rôle parent/enseignant; aucun chemin public de demande du rôle administrateur. L’attribution parent/enseignant passe par l’approbation d’un administrateur.
- Profil avec présentation, matières et niveaux libres.
- Gestion des propositions de cours, ressources et exercices éditoriaux; formulaires de brouillon, édition/réédition des brouillons ou refusés, et suivi des états `draft`, `submitted`, `in_review`, `approved`, `rejected`.
- Dépôt PDF, MP4 et WebM dans le bucket privé prévu (limite 50 MiB); création de liens signés temporaires de 60 secondes. La lecture et les opérations Storage de l’enseignant exigent maintenant un rôle enseignant actif, y compris après révocation.
- L’historique affiche les retours de revue enregistrés. Les indicateurs sont calculés depuis les enregistrements de l’enseignant; aucun tarif ou paiement enseignant n’est implémenté.
- Une approbation admin valide la contribution éditoriale, mais ne publie pas automatiquement de contenu pédagogique aux élèves.

### Administration

- Dashboard et compteurs calculés depuis la base; listes de comptes, étudiants, parents et enseignants filtrables/paginées.
- Approbation/refus des demandes de rôle; les comptes admis parent/enseignant sont accordés ou révoqués par RPC administrateur.
- Revue des contributions limitée aux transitions `submitted → in_review → approved/rejected`, avec notes et notifications.
- Notifications in-app envoyées par l’administrateur et journal des décisions/actions. Le journal est lisible seulement par un admin; les écritures passent par les RPC prévues.
- Le premier compte admin doit être bootstrappé par le propriétaire dans une session Supabase/SQL de confiance, après vérification de l’UUID; aucune inscription publique ne peut l’attribuer.

### Sécurité et architecture

- Les gardes React distinguent les rôles multiples pour l’expérience de navigation; elles ne constituent pas la frontière de sécurité.
- La migration ajoute des policies PostgreSQL RLS et des fonctions `SECURITY DEFINER` à `search_path` contrôlé; les RPC privilégient le rôle appelant, la propriété des lignes et l’état actif de la relation.
- Les rôles publics demandables sont limités à `parent` et `teacher`; l’admin est exclu des fonctions publiques et ne peut pas être attribué via formulaire.
- Les liens actifs conditionnent l’accès parent aux profils/données élève. Les lignes d’activité sont en lecture seule côté client. Les révisions de contribution et notifications respectent leur propriétaire/administrateur.
- Le bucket de contributions est privé et limité aux types et tailles autorisés. Les politiques Storage ont été corrigées pour retirer l’accès de l’enseignant lorsque son rôle/profil actif est révoqué.
- Aucun secret ni `service_role` n’a été ajouté au frontend ou au dépôt. Aucun tableau/score factice, cours élève, leçon, moteur d’exercice/examen, EduAI, paiement ou abonnement n’a été créé.

## Fichiers créés ou modifiés

### Créés

- `PHASE2_REPORT.md` — présent rapport.
- `supabase/migrations/20261114120000_phase2_user_spaces.sql` — migration Phase 2 additive.
- `src/features/access/RoleApplicationPage.tsx`.
- `src/features/parents/ParentPortal.tsx`.
- `src/features/teachers/TeacherPortal.tsx`.
- `src/features/administration/AdminPortal.tsx`.
- `src/layouts/RoleLayout.tsx`, `ParentLayout.tsx`, `TeacherLayout.tsx`, `AdminLayout.tsx`.
- `src/lib/phase2Migration.test.ts` — tests statiques sans connexion à une base.

### Modifiés

- `README.md`, `TODO.md`, `plan.md`.
- `public/manus-routes.json`.
- `src/app/App.tsx`, `src/app/AuthContext.tsx`, `src/layouts/StudentLayout.tsx`.
- `src/types/database.ts`, `src/styles.css`.

Aucune nouvelle dépendance de production n’a été ajoutée.

## Migrations, tables et policies

Deux fichiers SQL versionnés figurent dans le dépôt, dans l’ordre d’application prévu :

1. `20261113200000_phase1_foundation.sql` — migration Phase 1 existante.
2. `20261114120000_phase2_user_spaces.sql` — ajout Phase 2.

**Migrations exécutées par cette session : aucune.** L’instance Supabase cible et l’état des migrations ne sont pas accessibles ici; ne pas supposer que la base est à jour.

La migration Phase 2 crée et active RLS sur ces 13 tables :

- `role_applications`
- `parent_profiles`
- `teacher_profiles`
- `parent_invite_codes`
- `parent_link_requests`
- `parent_student_links`
- `learning_goals`
- `learning_activity`
- `content_submissions`
- `content_reviews`
- `notifications`
- `notification_preferences`
- `admin_audit_logs`

Elle ajoute aussi une lecture parent filtrée par liaison active sur les tables Phase 1 `profiles` et `student_profiles`. Les policies nommées sont :

- Identité/famille : `profiles_select_parent_linked_student`, `student_profiles_select_parent_linked_student`, `role_applications_select_owner_or_admin`, `parent_profiles_select_owner_or_admin`, `teacher_profiles_select_owner_or_admin`, `teacher_profiles_update_own`, `parent_link_requests_select_participants_or_admin`, `parent_student_links_select_participants_or_admin`.
- Données de progression/contenu : `learning_goals_select_student_or_linked_parent`, `learning_activity_select_student_or_linked_parent`, `content_submissions_select_owner_or_admin`, `content_submissions_update_teacher_draft`, `content_reviews_select_admin_or_submission_owner`.
- Notifications/audit : `notifications_select_owner_or_admin`, `notification_preferences_select_owner`, `admin_audit_logs_select_admin`.
- Storage privé : `eduflow_teacher_file_read_owner_admin`, `eduflow_teacher_file_insert_own_draft`, `eduflow_teacher_file_update_own_draft`, `eduflow_teacher_file_delete_own_draft`.

Les insertions ou transitions sensibles (codes de liaison, décisions d’élève, demandes/rôles, objectifs, revue, notifications et audit) passent par des RPC restreintes; le client authentifié n’a pas de droit direct pour s’attribuer un rôle privilégié, approuver une contribution ou écrire le journal admin. Le bucket `eduflow-teacher-contributions` est privé, avec limite déclarée de 50 MiB et types PDF/MP4/WebM.

## Tests et vérifications

| Contrôle | Résultat |
| --- | --- |
| `pnpm typecheck` (TypeScript strict) | Réussi |
| `pnpm lint` | Réussi |
| `pnpm test` | Réussi — 12 tests : validateurs locaux et assertions statiques des contrats Phase 2 |
| `pnpm build` | Réussi — build production Vite |
| Parseur PostgreSQL `pglast` | Réussi — 142 instructions de premier niveau analysées; les corps PL/pgSQL ne sont pas exécutés/validés sur un vrai serveur |
| Manifeste de routes | Réussi — 37 routes correspondent exactement aux routes React et le JSON est servi en HTTP 200 |
| Routes Preview `/`, `/teacher/courses`, `/parent/dashboard`, `/admin` | HTTP 200; cela confirme le service SPA, pas une connexion de rôle |
| Audit indépendant read-only | 3 défauts détectés puis corrigés : accès Storage enseignant après révocation, retours de revue invisibles et agrégats parent pouvant sembler complets malgré une liste plafonnée |
| LSP/diagnostics WebDev | TypeScript enregistré (`registered: true`) |
| Tests Supabase Auth, RLS, rôles réels, refus inter-comptes, liaison, dépôt Storage | Bloqués : aucune URL/clé publishable Supabase, migration appliquée ou compte de rôle disponible dans l’environnement |
| Tests visuels des espaces protégés sur appareils réels | Non effectués : sans session Supabase/configuration les pages protégées s’arrêtent à l’état non configuré; la feuille de styles mobile-first est présente, mais l’acceptation responsive par rôle reste à vérifier après connexion |

**Échecs finaux : aucun.** Un typecheck intermédiaire a signalé une capture nullable du client pendant la correction de l’audit; le code a été corrigé et la suite complète finale passe. Le parseur ne remplace pas un test PostgreSQL/Supabase : les tables Storage réelles, les corps des fonctions PL/pgSQL, les policies RLS et leurs interactions demeurent non éprouvés sur l’instance cible.

## Variables et actions manuelles requises

### WebDev Preview et Vercel

- Requises : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Facultative, uniquement après la configuration complète de Google OAuth : `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED=true`.
- Ajouter les deux valeurs publiables aux environnements WebDev Preview et Vercel concernés, puis redémarrer/reconstruire. Aucune clé `service_role`, clé privée Google ou secret de signature ne doit être exposé au frontend.

### Supabase

1. Vérifier que le projet visé est la bonne instance EduFlow et inspecter l’historique et les données avant d’exécuter quoi que ce soit.
2. Examiner/appliquer, une seule fois et dans l’ordre, les deux migrations ci-dessus. Ne pas exécuter `db reset`, ne pas supprimer de données et ne pas désactiver RLS.
3. Créer/confirmer un premier compte propriétaire, vérifier son UUID puis lui attribuer le rôle `admin` depuis une session Supabase/SQL de confiance; exemples d’instruction dans `README.md`. Ne jamais utiliser le parcours public pour cette opération.
4. Créer ensuite des comptes de test distincts étudiant, parent, enseignant, administrateur; faire approuver le rôle parent/enseignant; tester acceptation/refus/révocation des liaisons, chaque accès autorisé et refusé, l’upload et les transitions de revue.
5. Configurer `Site URL` et les redirections Auth valides pour Preview/Vercel; garder la confirmation email active et configurer/tester le SMTP avant production. Le fournisseur Google demeure désactivé tant que ses callbacks n’ont pas été testés.
6. Avant ouverture publique à des mineurs, faire réviser la protection des données, les conditions/confidentialité brouillon, la légitimité de la liaison parent-enfant et les obligations de consentement applicables.

Après avoir ajouté les paramètres dans WebDev, il faudra relancer Preview puis effectuer les tests live. Aucun test n’est présenté comme réussi avant cette étape.
