# EduFlow — Plan d’implémentation Phase 1

## Objectif et périmètre

Construire les fondations réellement opérationnelles d’EduFlow, une plateforme EdTech internationale pensée d’abord pour les élèves. Cette livraison couvre uniquement la Phase 1 du cahier des charges : identité et accueil public, authentification et profil étudiant, onboarding et premier tableau de bord, modèle de données Supabase et contrôle d’accès. Les espaces parent, enseignant et administration sont seulement anticipés dans les types, conventions et structure de modules. Les cours, exercices, examens, assistant IA, paiements, notifications métier, PWA et applications mobiles ne sont pas réalisés dans cette phase.

Le projet a été créé dans le sandbox WebDev après vérification que le workspace initial ne contenait pas de code d’application. La plateforme WebDev n’a pas de base applicative Manus activée; l’architecture de données demandée demeure Supabase, service externe choisi dans le cahier des charges. Aucun secret de service ni clé de rôle privilégié ne sera placé dans le bundle navigateur.

## Approche technique

- Frontend : React, TypeScript et Vite; Tailwind CSS et composants accessibles légers; React Router pour routes publiques et protégées; Supabase JS pour Auth et accès direct aux tables soumises à RLS.
- Backend applicatif de cette phase : Supabase Auth/PostgreSQL au moyen de migrations SQL versionnées dans `supabase/migrations`. Pas de serveur supplémentaire, de stockage ou d’Edge Function tant qu’aucun besoin de Phase 1 ne l’exige.
- Configuration navigateur : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, toutes deux des valeurs client prévues pour une utilisation publique et protégées par RLS. Aucune clé `service_role`, clé IA ou secret de paiement ne sera utilisée côté client.
- Authentification : email/mot de passe, confirmation d’adresse et récupération/réinitialisation via Supabase Auth; OAuth Google appelé seulement lorsqu’il est effectivement activé et configuré par l’utilisateur dans Supabase. Le flux d’inscription publique crée uniquement des élèves.
- Base : profils, rôles et données d’onboarding séparés. Un trigger contrôlé à la création du compte attribue le rôle initial `student`; la table des rôles n’autorise aucune écriture depuis les clients. Les rôles prévus pour les phases futures peuvent exister dans le modèle, mais une nouvelle inscription ne peut obtenir ni choisir `admin`, `teacher` ou `parent`.
- RLS : activation sur toutes les tables applicatives. Un utilisateur peut lire/mettre à jour uniquement son profil et son profil étudiant; les référentiels scolaires actifs sont lisibles par les inscrits; aucune politique client ne permet l’attribution ou l’altération d’un rôle. Les migrations précisent contraintes, clés étrangères, index, fonctions/triggers de portée minimale et politiques.
- Données scolaires initiales : référentiel configurable dérivé des classes et séries explicitement données dans le cahier. Il constitue une configuration initiale, non une attestation de programme officiel. Les matières et contenus officiels ne sont pas inventés.
- Vérification et déploiement : tests locaux du build, TypeScript, lint, routes, comportement non authentifié et états sans données. Les tests Auth de bout en bout contre Supabase ne seront annoncés comme réalisés qu’après configuration des variables et application de la migration sur un projet réel. Aucun déploiement public ou activation de publication automatique n’est prévu dans cette phase.

## Décisions de design

- **Direction** : identité éducative numérique rassurante, lumineuse et contemporaine, reprenant le logo fourni et les couleurs du cahier des charges.
- **Principes** : lecture immédiate sur petit écran; confiance et sobriété; langage pédagogique clair; états vides honnêtes, sans statistiques simulées.
- **Couleurs** : bleu nuit `#172554` pour la confiance et la structure; bleu `#2563EB` pour l’action; jaune `#FBBF24` comme accent chaleureux; vert `#16A34A` réservé aux succès; fond blanc/gris clair `#F1F5F9`.
- **Disposition** : page d’accueil construite comme un parcours éditorial vertical (promesse, usages, aperçu produit, niveaux, bénéfices, tarifs indicatifs et FAQ), plutôt qu’un panneau marketing dense; navigation mobile compacte. Après connexion, shell d’apprentissage dédié, sans navigation marketing superflue.
- **Éléments-signature** : logo fourni; accents en rubans/courbes d’apprentissage inspirés du livre ouvert; petites pastilles de progression utilisées uniquement lorsque des données réelles existent.
- **Interactions** : actions explicites, formulaires accessibles avec validation et erreurs localisées, navigation clavier, confirmation visible et absence de faux boutons.
- **Mouvement** : transitions courtes et discrètes (environ 150–220 ms), respect de `prefers-reduced-motion`; aucune animation indispensable à la compréhension.
- **Typographie** : Inter ou police système équivalente; titres contrastés en bleu nuit, texte courant confortable, tailles adaptées au mobile.
- **Essence de marque** : l’espace d’apprentissage qui aide chaque élève à comprendre et progresser, avec confiance, clarté et ambition.
- **Voix** : encourageante, directe, précise. Exemples : « Comprends chaque notion, à ton rythme. » et « Ton espace d’apprentissage commence ici. »
- **Logo** : utiliser l’image fournie comme marque EduFlow, avec une variante de taille adaptée à l’en-tête si possible sans altérer son identité. Ne pas ajouter de drapeau, carte ni symbole national.
- **Couleur-signature** : bleu EduFlow `#2563EB`.

## Structure cible

```text
public/
  manus-routes.json       # manifeste complet des routes du site
src/
  app/                    # Router, guards, composition générale
  components/             # boutons, champs, alertes, navigation, logo
  layouts/                # layout public et shell étudiant
  features/
    auth/                 # formulaires, callback, récupération et session
    students/             # onboarding, profil étudiant, tableau de bord vide
    public/               # accueil, offres/FAQ honnêtes et pages publiques du cahier
  lib/                    # client Supabase optionnel, validations et tests unitaires
  types/                  # rôles futurs, taxonomie scolaire, profil
  styles.css              # Tailwind, tokens de marque et responsive global
supabase/
  migrations/             # schéma, policies RLS et données initiales versionnés
README.md                 # configuration manuelle Supabase/Vercel
TODO.md                   # critères de phase et état réel de livraison
```

Le logo est servi depuis le stockage durable du projet; la configuration Vite et les scripts restent à la racine. Les requêtes Supabase sont appelées depuis les modules de fonctionnalité au moyen du client typé `src/lib/supabase.ts`; les styles globaux et les tests sont respectivement `src/styles.css` et co-localisés dans `src/lib`. Les conventions de routes et types doivent faciliter l’ajout ultérieur des espaces parent, enseignant et administration sans les implémenter maintenant.

## Dépendances et limites

Les outils nécessaires sont Vite/React/TypeScript, Tailwind, React Router, `@supabase/supabase-js`, et un outillage de lint/tests proportionné. La version du gestionnaire de paquets sera verrouillée et les politiques des scripts de dépendances seront déclarées avant installation. Les identifiants du projet Supabase et la configuration OAuth/email relèvent du propriétaire du service; ils seront demandés par canal de configuration protégé et documentés sans être commités. Les migrations ne seront exécutées sur aucun projet de production partagé sans liaison explicite et confirmation des cibles; dans le cas contraire, elles seront livrées prêtes à appliquer.

## Contraintes persistantes

Respecter exclusivement la Phase 1; ne pas supprimer de données; ne jamais désactiver RLS; ne pas créer de fausses fonctions, statistiques, matières officielles ou paiements; ne pas exposer de secrets; ne déclarer une intégration fonctionnelle qu’après l’avoir réellement testée; arrêter après cette livraison et attendre validation de l’utilisateur avant toute Phase 2.
