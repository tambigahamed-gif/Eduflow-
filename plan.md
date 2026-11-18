# EduFlow — Plan projet (Phases 1–2 préservées; Phase 3 proposée)

## Contexte et état vérifié

EduFlow est le projet React 19, TypeScript, Vite, Tailwind, React Router et Supabase JS situé dans `/home/ubuntu/eduflow`. Le dépôt local est propre sur `main`; l’application répond sur le port Preview 3000 et les diagnostics TypeScript gérés sont enregistrés. La configuration WebDev indique que `server`/`database` Manus sont désactivés, que le dépôt canonique WebDev reste géré par Manus et qu’aucune publication automatique n’est activée.

La Phase 1 fournit le site public, l’authentification et l’espace étudiant, la taxonomie scolaire initiale et sa migration. La Phase 2 ajoute les espaces parent, enseignant et administration, les soumissions, les liens parent-enfant et leurs politiques. Ces capacités et leurs routes doivent rester intactes. Le README du dépôt précise que les migrations Phase 1 et Phase 2 sont livrées mais qu’aucune n’a été appliquée sur une base réelle. Au contrôle du 16 novembre 2026, `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont absentes; aucune base ni Storage cible ne peut donc être testée ou modifiée dans le cadre de la proposition.

## Objectif et limites de la Phase 3

Construire uniquement le système pédagogique de contenus : taxonomie configurable, cours/leçons publiés, bibliothèque, vidéos externes, progression de lecture, favoris et historique, workflow d’administration et soumissions enseignant. Conserver les phases antérieures et rester compatible avec les parents et enseignants existants. Ne pas implémenter les examens complets, corrections, évaluations élèves ni EduAI. Les exercices déjà proposés par les enseignants restent des soumissions éditoriales; aucun moteur d’exercice n’est créé.

Les matières ne seront pas codées en dur ni limitées à un nombre fixe. La nouvelle base pourra contenir autant de pays, systèmes, matières et chapitres que l’administration en configure. Les niveaux/classes et séries déjà présents (dont CP1, CP2, CE1, CE2, CM1, CM2, 6e, 5e, 4e, 3e, 2nde, 1re, Terminale et A/C/D pour le système déjà semé) seront conservés; ils ne seront pas présentés comme un programme officiel universel. Il ne sera pas ajouté de matières de démonstration.

## Approche de données et migrations

Créer une migration Supabase versionnée, strictement additive pour les données. Elle réutilise `education_systems`, `school_levels`, `school_classes` et `school_series` au lieu de créer une deuxième taxonomie. Comme Phase 1 rend actuellement `country_code` unique dans `education_systems`, la migration ajoutera un référentiel de pays et modifiera prudemment la contrainte d’unicité de façon à permettre plusieurs systèmes éducatifs pour un même pays, sans supprimer ni réécrire les systèmes existants. Elle ajoutera une association explicite classe-série afin que les séries ne soient proposées que là où elles s’appliquent.

Référentiel configurable à ajouter :

- Pays et systèmes éducatifs, en conservant les identifiants et données existants.
- Matières par système éducatif et association matière-classe, sans liste de matières codée en dur.
- Chapitres par matière et classe, avec ordre, nom et état actif.

Modèle pédagogique prévu : cours organisés par matière-classe, leçons rattachées à un cours et à un chapitre, ressources documentaires et vidéos rattachées à une leçon ou au référentiel concerné. Les leçons stockeront les champs structurés demandés : titre, description, objectifs, introduction, explications, définitions, exemples, formules, illustrations, exercices proposés sous forme éditoriale sans tentative ni correction automatisée, résumé et points importants; elles garderont auteur, statut, décideur et dates de validation. Les ressources auront des métadonnées PostgreSQL typées (catégorie, MIME, taille, nom, chemin, droits de téléchargement et rattachement). Les vidéos stockeront titre, description, URL externe, fournisseur, miniature, durée, classe, matière, chapitre et statut; aucune vidéo ne sera hébergée par EduFlow dans cette phase.

Les choix de statut seront explicites : brouillon, soumis, en examen, approuvé/publié, refusé ou archivé selon le type d’enregistrement. Des tables distinctes stockeront les favoris et la progression/reprise (position/section pour les leçons, position et état de visionnage pour les vidéos); la page de lecture sauvegardera puis restaurera la section réellement consultée. Les événements de leçon réellement terminée pourront alimenter la progression parentale Phase 2 via une opération sécurisée; ils ne créeront jamais de résultat d’exercice ou d’examen.

## Parcours et workflow

### Élève

Ajouter un catalogue de cours filtrable et recherchable selon le profil scolaire réel; pages de matière, chapitre et leçon; lecteur de leçon structuré; bibliothèque de PDF, documents, images, illustrations et fiches de révision; espace vidéo; favoris; historique et reprise. Les états vides seront honnêtes lorsque le programme ou le contenu publié n’existe pas. Les ressources seront téléchargeables uniquement si leur métadonnée et leur permission le permettent.

### Enseignant

Étendre les contributions Phase 2 pour déposer une proposition structurée de leçon/cours, ressource ou vidéo externe, l’enregistrer en brouillon et la soumettre. Présenter les états réellement enregistrés et les retours de revue. Un enseignant ne peut jamais valider, publier ou archiver du contenu; les contributions restent gratuites, sans paiement.

### Administration

Étendre l’espace admin par des interfaces de gestion du programme (pays/systèmes, niveaux/classes/séries, matières, association aux classes et chapitres) et un CMS de cours, leçons, ressources et vidéos. L’administration peut créer, modifier, organiser, examiner, approuver/publier et archiver. Les propositions des enseignants ne deviennent accessibles aux élèves qu’après une décision d’approbation explicite. Les actions et transitions importantes sont auditables. Les contenus déjà approuvés par le workflow Phase 2 ne seront pas automatiquement exposés comme leçons Phase 3 sans données structurées et validation Phase 3.

### Vidéos et stockage

La première version utilisera uniquement des URL vidéo externes explicitement prises en charge (intégration YouTube/Vimeo et, si sélectionné pendant l’implémentation, média direct HTTPS). Les domaines seront validés/allowlistés; la progression sera sauvegardée quand le lecteur fournit une position fiable. Aucun upload, stockage ou hébergement de vidéo ne sera revendiqué. Les miniatures pourront être des URL externes autorisées ou des images stockées comme ressources.

Utiliser Supabase Storage pour PDF, documents et images, et PostgreSQL pour le catalogue et les métadonnées. Garder les buckets privés. Réutiliser le bucket privé de contributions enseignant pour les dépôts en attente et établir, au besoin, un bucket privé séparé pour les ressources publiées administrativement. Les chemins d’objet et politiques distingueront brouillons/contributions non publiés des fichiers de contenus approuvés. Les lectures/téléchargements passeront par les permissions Storage et des liens signés lorsque requis; ni URL permanente publique ni clé `service_role` côté client.

## Permissions et protection des données

Toutes les nouvelles tables activeront RLS. Les référentiels actifs pourront être lus par les visiteurs/élèves selon le besoin; leur création et modification resteront réservées à l’administration. Les élèves authentifiés ne consulteront que le contenu publié compatible avec leur système et classe, ainsi que leurs propres favoris et historique. Les parents n’accéderont toujours qu’aux enfants liés et aux événements pédagogiques réels autorisés. Les enseignants actifs ne liront et ne modifieront que leurs propres soumissions encore modifiables. L’interface admin est protégée côté route, mais RLS/RPC est l’autorité; les mutations sensibles utilisent des fonctions SQL vérifiant le rôle `admin`, les transitions autorisées, et journalisent les décisions. Aucun flux public ne permet l’auto-attribution du rôle admin.

Les migrations ne supprimeront pas les tables/données des phases précédentes et ne désactiveront jamais RLS. Les migrations seront livrées avec assertions/tests statiques locaux; leur exécution sur Supabase est une opération distincte qui attend la configuration et la confirmation du projet cible. Aucun test ne fera de write/delete sur une base partagée ou inconnue.

## Structure prévue du projet

```text
src/
  app/                              # auth, routes et guards existants préservés
  features/learning/                # catalogue, matière, chapitre, leçon, bibliothèque, vidéos
  features/students/                # dashboard conservé; favoris, historique et progression
  features/teachers/                # contributions Phase 2 étendues aux contenus Phase 3
  features/administration/           # administration existante + programme et CMS
  layouts/                          # shells existants, extensions de navigation par rôle
  lib/                              # client Supabase, validations et tests statiques SQL
  types/database.ts                 # schéma généré/typé étendu sans effacer les types existants
  styles.css                        # identité partagée, nouveaux composants mobile-first
supabase/migrations/                # migration Phase 3 additive et versionnée
public/manus-routes.json            # manifeste synchronisé avec toutes les routes de pages
```

Les dépendances existantes suffisent en principe (React, TypeScript, Supabase JS, Lucide, Vitest); n’ajouter un lecteur SDK de fournisseur vidéo que si le choix final l’exige et après vérification de compatibilité. Les variables client restent les seules variables Supabase exposées au navigateur : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. Pas de secret serveur nécessaire pour le parcours décrit.

## Direction visuelle conservée et appliquée

- **Mouvement :** EdTech éditoriale contemporaine, claire et rassurante, issue du logo EduFlow.
- **Principes :** lisibilité d’abord, mobile prioritaire, contenu hiérarchisé, états honnêtes et confiance dans les accès.
- **Couleurs :** bleu nuit `#172554` pour la structure, bleu `#2563EB` pour l’action et la navigation, jaune `#FBBF24` comme accent mémorable, vert `#16A34A` pour les validations; blanc et gris clair pour une lecture calme.
- **Disposition :** parcours vertical lisible sur smartphone, navigation latérale repliable sur grand écran, filtres accessibles et contenu principal dégagé; éviter les tableaux denses sur mobile.
- **Éléments signatures :** ruban de progression, accents courbes inspirés du livre du logo, petits repères de couleur par état/statut.
- **Interactions/animation :** retours d’état immédiats et explicites, lecture sauvegardable, contrôles accessibles; transitions courtes et discrètes respectant `prefers-reduced-motion`.
- **Typographie :** Inter ou police système équivalente pour l’interface; titres sobres en échelle régulière, textes de leçon généreusement espacés et largeur de lecture maîtrisée.
- **Essence de marque :** « La plateforme qui relie programmes structurés, leçons accessibles et ressources vérifiées pour les élèves et leurs accompagnants. » Personnalité : claire, encourageante, fiable.
- **Voix :** directe, bienveillante, non infantilisante. Exemples : « Reprends là où tu t’étais arrêté. » « Cette leçon n’est pas encore publiée. »
- **Logo :** réutiliser le logo fourni et ses motifs de livre ouvert/cap; ne pas le remplacer par un pictogramme générique.
- **Couleur signature :** bleu EduFlow `#2563EB`, accompagné du jaune du logo.

## Préconditions et limites d’intégration

Au dernier contrôle, les deux paramètres Supabase sont absents, le dépôt indique que les migrations précédentes ne sont pas appliquées et il n’existe pas de base/Storage de test confirmé. La phase peut être codée et contrôlée localement sans cela, mais inscription/connexion, politiques RLS, Storage, cours avec données réelles et tests d’accès par rôles resteront non vérifiés en live jusqu’à configuration de Supabase et application ordonnée des migrations 1, 2 puis 3 sur l’instance EduFlow vérifiée. Aucun déploiement Vercel ou publication publique n’est inclus dans cette phase.
