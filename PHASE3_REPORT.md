# EduFlow — Rapport Phase 3 : Système pédagogique

**État :** implémentation du code Phase 3 terminée et contrôles locaux réussis. La validation de l’intégration Supabase en conditions réelles reste bloquée jusqu’à la configuration du projet et l’application manuelle des migrations. Le périmètre s’arrête strictement avant la Phase 4 (examens complets et EduAI).

## 1. Résumé

La Phase 3 ajoute un référentiel scolaire configurable, un catalogue pédagogique élève, les pages de cours/chapitres/leçons, les favoris et l’historique de lecture, une bibliothèque de ressources avec métadonnées PostgreSQL et stockage Supabase Storage privé, un lecteur YouTube/Vimeo externe et un CMS de contenus administrateur. L’espace enseignant existant est étendu pour déposer des leçons, ressources et vidéos en brouillon et les soumettre à l’administration; un enseignant ne peut ni approuver ni publier comme contenu validé.

Les nouvelles fonctions sont raccordées au routeur existant, aux layouts par rôle et aux migrations versionnées. Le code ne contient aucun cours, aucune statistique ni aucun résultat fictif. En l’absence de Supabase configuré, les écrans indiquent explicitement que le service n’est pas relié.

## 2. Fonctionnalités livrées dans le code

### Organisation scolaire

- Gestion administrateur de pays et de systèmes éducatifs, niveaux, classes, séries, matières, associations classe–matière, associations classe–série et chapitres.
- Les matières et les séries ne sont pas limitées à une liste codée en dur. Les programmes peuvent être saisis selon chaque système. Les référentiels initiaux ne prétendent pas être des programmes officiels.
- Réutilisation des tables existantes de niveaux, classes et séries des phases précédentes; ajout des associations et du référentiel nécessaires. Une mise à jour de contrainte permet plusieurs systèmes éducatifs par pays.

### Apprentissage élève

- Catalogue de cours avec recherche et filtrage, pages de matières et chapitres, page de cours et lecture structurée d’une leçon publiée.
- Champs de leçon disponibles : titre, description, objectifs, introduction, explications, définitions, exemples, formules, illustrations, exercices associés sous forme éditoriale, résumé et points clés. L’auteur et les états de validation/publication sont conservés en base.
- Favoris, historique, marqueur « terminé » et sauvegarde/reprise à la section réellement consultée. La progression est enregistrée au moyen d’une RPC sécurisée et rattachée à l’élève connecté.
- Une reprise en secondes est utilisée pour les vidéos; les leçons reprennent par section. Aucune tentative, notation ou correction d’exercice n’est créée en Phase 3.

### Bibliothèque et vidéos

- Ressources PDF, documents, images, illustrations, fiches et fichiers audio pris en charge, avec métadonnées PostgreSQL et chemin Storage. Téléchargement par URL signée temporaire uniquement lorsque la ressource est publiée, accessible au parcours et téléchargeable.
- Les vidéos sont des URL HTTPS YouTube/Vimeo, avec fournisseur, miniature, durée, rattachement scolaire, lecteur externe et suivi de progression permis par le lecteur.
- EduFlow n’héberge ni ne téléverse de vidéos; les liens et limites du fournisseur demeurent applicables.

### Administration et contributions enseignantes

- CMS administrateur pour configurer le programme et créer des cours, leçons, ressources et vidéos en brouillon; modifier les titres/descriptions; approuver, publier ou archiver. Les politiques SQL et RPC sont la frontière de sécurité, pas seulement les gardes d’interface.
- Un enseignant peut créer un brouillon de leçon, vidéo externe ou ressource privée, puis le soumettre et consulter ses statuts/commentaires. Les fichiers téléversés sont privés; un contenu soumis n’est pas visible aux élèves avant l’approbation administrative puis sa publication.
- Les contributions restent gratuites; aucune fonctionnalité de paiement ou de Phase 4 n’a été ajoutée.

## 3. Fichiers créés ou modifiés

### Fichiers modifiés

- `README.md` — documentation des variables, précautions Supabase et ordre des migrations incluant Phase 3.
- `TODO.md` — état et critères de validation des phases.
- `plan.md` — décisions Phase 3, exercices éditoriaux et reprise par section.
- `public/manus-routes.json` — manifeste synchronisé avec le routeur.
- `src/app/App.tsx` — routes catalogue, cours, matières, chapitres, leçons, ressources, vidéos, favoris, historique et pages d’administration.
- `src/features/administration/AdminPortal.tsx` — navigation d’administration pédagogique.
- `src/features/teachers/TeacherPortal.tsx` — entrée vers les propositions pédagogiques.
- `src/layouts/RoleLayout.tsx`, `src/layouts/StudentLayout.tsx` — navigation et accès par espace.
- `src/styles.css` — styles responsive des vues pédagogiques.
- `src/types/database.ts` — types des nouvelles tables, statuts et RPC.

### Fichiers créés

- `PHASE3_REPORT.md` — présent rapport.
- `src/features/administration/LearningAdmin.tsx` — configuration du programme et CMS.
- `src/features/learning/ExternalVideoPlayer.tsx` — lecteur intégré aux fournisseurs externes.
- `src/features/learning/LearningCommon.tsx` — éléments communs et états de l’interface d’apprentissage.
- `src/features/learning/StudentLearning.tsx` — catalogue, cours, matières, chapitres, leçons, ressources, vidéos, favoris et historique.
- `src/features/learning/date.ts` — utilitaire de présentation des dates.
- `src/features/learning/videoLinks.ts` et `src/features/learning/videoLinks.test.ts` — validation des liens externes et tests.
- `src/features/teachers/TeacherLearningSubmissions.tsx` — dépôt et soumission des contenus Phase 3.
- `src/features/teachers/resourceFilename.ts` et `src/features/teachers/resourceFilename.test.ts` — assainissement des noms et tests.
- `src/lib/phase3Migration.test.ts` — vérifications statiques du contrat de migration.
- `supabase/migrations/20261116060000_phase3_pedagogical_system.sql` — migration Phase 3.

## 4. Migration, tables et RLS

La migration livrée est `supabase/migrations/20261116060000_phase3_pedagogical_system.sql`. Elle doit être appliquée après `20261113200000_phase1_foundation.sql`, puis `20261114120000_phase2_user_spaces.sql`.

**État d’exécution : aucune migration n’a été exécutée dans une base Supabase pendant cette Phase 3.** Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ne sont pas présentes dans l’environnement de validation, aucun projet de base externe n’est connecté et aucune modification de base externe n’a été faite.

Les 11 tables nouvelles de la migration ont chacune `ENABLE ROW LEVEL SECURITY` :

1. `education_countries`
2. `school_class_series`
3. `school_subjects`
4. `school_class_subjects`
5. `school_chapters`
6. `learning_courses`
7. `learning_lessons`
8. `learning_resources`
9. `learning_videos`
10. `student_favorites`
11. `student_learning_progress`

La migration étend les tables Phase 1/2 existantes au lieu de dupliquer les niveaux, classes, séries et systèmes éducatifs. Elle conserve les données existantes, importe de façon non destructive les codes pays déjà présents et ajoute des contraintes de cohérence référentielle/scolaire.

Les politiques et contrôles ajoutés couvrent notamment : lecture de référentiels actifs; lecture élève des seuls contenus publiés correspondant à son système, sa classe et sa série; accès propriétaire aux favoris et à la progression; lecture parentale de la progression uniquement via le contrôle de liaison active existant; écritures de référentiel et CMS réservées à l’admin; absence de grant/policy d’écriture enseignant sur le contenu canonique; contraintes de rattachement système/classe/matière/chapitre/série; transitions de revue et publication via RPC admin; audit des insertions, mises à jour, suppressions de référentiels/contenus et actions de revue/publication. La suppression directe d’objets du bucket pédagogique n’est pas autorisée par de nouvelles policies.

Les RPC d’usage important comprennent `phase3_review_submission`, `phase3_admin_publish`, `phase3_toggle_favorite` et `phase3_update_progress`, ainsi que les fonctions internes d’éligibilité étudiant et de validation des liens scolaires. Elles ont été examinées statiquement; leur exécution n’a pas été testée sur Supabase.

### Storage

La migration crée si absent le bucket **privé** `eduflow-learning-resources`, limite les objets à **50 MiB** et autorise les types PDF, DOCX, JPEG, PNG, WebP, MP3, MP4 audio et texte brut. Elle conserve les politiques du bucket privé `eduflow-teacher-contributions` créé par la migration Phase 2 et accorde la lecture des fichiers liés uniquement à une ressource publiée accessible au parcours. Les téléchargements de l’application utilisent des URL signées de courte durée.

La migration ne change pas la visibilité ni les paramètres d’un bucket préexistant en conflit; vérifier le bucket existant dans le projet Supabase cible avant d’appliquer les scripts.

## 5. Résultats de vérification

| Vérification | Résultat | Portée / limite |
|---|---|---|
| `pnpm lint` | Réussi | Aucune erreur ESLint. |
| `pnpm typecheck` | Réussi | `tsc --noEmit`, aucune erreur TypeScript. |
| `pnpm test` | Réussi | 5 fichiers de test, 33 tests réussis, dont les tests Phase 3, liens vidéo et noms de ressources. |
| `pnpm build` | Réussi | Build Vite de production terminé; artefacts dans `dist`. |
| `git diff --check` | Réussi | Aucun problème de whitespace détecté avant génération de ce rapport. |
| Manifeste et routeur | Réussi | 50 routes uniques; égalité manifeste/source vérifiée. Réponse HTTP 200 et shell React constatés sur 8 routes représentatives, dont des routes dynamiques. |
| Responsive mobile | Capturé à 375 × 812 px | Captures effectuées pour l’accueil, `/catalog` et `/admin/programme`. L’accueil public s’affiche à cette largeur. Les vues protégées montrent l’état honnête « Supabase à configurer »; l’interface authentifiée réelle ne peut pas être exercée sans compte et backend. |
| Auth réelle, RLS et séparation des comptes | Non testées / bloquées | Pas de Supabase configuré, de migration appliquée ni de comptes de test par rôle. Ce n’est pas un résultat de test réussi. |
| Upload/téléchargement Storage réel | Non testés / bloqués | Bucket et métadonnées livrés en code/migration seulement; aucun service Storage externe relié. |
| Création, revue et publication contre PostgreSQL réel | Non testées / bloquées | Les formulaires et RPC sont écrits; leur transaction et leurs permissions attendent la base cible. |
| Déploiement Vercel | Non effectué | Aucun déploiement public n’a été déclenché. Auto Publish est désactivé. |

Le scan de secrets a seulement relevé les valeurs de remplacement descriptives de `.env.example` (`your-supabase-publishable-key`), pas une clé réelle. Les clés `service_role` ne sont pas requises par le frontend et ne doivent jamais y être ajoutées.

## 6. Variables et actions manuelles

### Supabase

1. Dans les paramètres d’environnement WebDev et Vercel, renseigner seulement `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (ou clé anon publique). Ne pas utiliser la clé `service_role`.
2. Confirmer que le projet Supabase sélectionné est bien la cible EduFlow et vérifier son schéma/migrations avant toute exécution. Appliquer dans l’ordre les migrations Phase 1, Phase 2, Phase 3 indiquées ci-dessus; ne pas utiliser `db reset`, ne pas supprimer de données et ne pas désactiver RLS.
3. Vérifier les buckets privés et leurs limites/politiques dans Storage après application; la migration ne rend pas les fichiers publics.
4. Autoriser dans Auth les origines Preview/production et les chemins `/auth/callback` et `/reset-password`. Garder Google OAuth désactivé tant que le fournisseur, les callback URLs et le test réel ne sont pas effectués. Le drapeau facultatif `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED` reste `false` par défaut.
5. Créer le premier rôle administrateur par la procédure sécurisée Supabase déjà documentée dans `README.md`, après vérification de l’UUID du propriétaire; aucun parcours public ne permet de devenir admin.

### Vercel

Utiliser `pnpm install --frozen-lockfile`, `pnpm build`, le répertoire de sortie `dist` et la réécriture SPA de `vercel.json`. Le projet requiert Node.js `>=22.12` et pnpm `11.25.0`. Ajouter les variables frontend uniquement aux environnements voulus, redéployer après configuration et tester Auth/RLS/Storage sur l’instance réellement destinée à la production avant ouverture publique.

## 7. Éléments hors périmètre et décision attendue

Aucun examen complet, moteur de correction, score d’évaluation, EduAI ni paiement/abonnement n’a été ajouté. Les exercices éventuellement enregistrés dans une leçon sont du texte éditorial uniquement. EduFlow n’héberge pas de vidéo.

**La Phase 3 est livrée au niveau du code et des tests locaux, mais la validation opérationnelle complète attend Supabase.** Le dépôt peut être livré en checkpoint sans déployer le site. Merci de valider le rapport et, après configuration Supabase, de demander la reprise pour exécuter les vérifications live manquantes. Je m’arrête ici sans commencer la Phase 4.
