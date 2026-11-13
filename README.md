# EduFlow — fondations Phase 1

EduFlow est un frontend React/TypeScript/Vite qui utilise **un projet Supabase externe** pour Auth et PostgreSQL. Les valeurs d’environnement du frontend sont des clés publiables : elles ne donnent aucun privilège par elles-mêmes et ne remplacent jamais les politiques RLS.

## Lancer en développement

Prérequis : Node.js `>=22.12` et pnpm `11.25.0` (déclaré dans `package.json`).

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Sans valeurs Supabase, les pages publiques restent accessibles; les formulaires d’authentification indiquent que le service n’est pas relié et ne prétendent pas effectuer d’opération.

## Supabase à configurer manuellement

1. Créer/sélectionner le projet Supabase EduFlow et conserver les règles de sécurité par défaut. Vérifier que l’API et Supabase Auth sont disponibles.
2. Dans **SQL Editor**, examiner puis appliquer une fois `supabase/migrations/20261113200000_phase1_foundation.sql` au projet voulu. La migration est additive. Ne l’exécuter qu’après avoir vérifié que la cible est le projet EduFlow attendu.
3. Dans **Project Settings → API**, copier l’URL du projet et la clé **publishable** (ou l’ancienne clé anon, si le tableau de bord ne fournit pas encore de clé publishable). Ne jamais utiliser `service_role`.
4. Dans l’environnement de développement WebDev, définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, puis redémarrer l’application. Pour Vercel, ajouter les mêmes variables dans Project Settings → Environment Variables aux environnements souhaités, puis redéployer.
5. Dans **Authentication → URL Configuration**, définir l’URL principale correcte, puis autoriser les redirections vers `/auth/callback` et `/reset-password` pour l’origine Preview en cours et le domaine de production. Les URL exactes dépendent des domaines attachés par le propriétaire.
6. Garder la confirmation email activée. Pour l’envoi de vrais emails en production, configurer et tester un SMTP maîtrisé; les limites d’envoi du fournisseur par défaut peuvent être restrictives.
7. Google OAuth reste masqué par défaut. Pour l’activer, configurer et tester le fournisseur Google dans Supabase Auth, ajouter l’URL de callback OAuth Supabase indiquée par le tableau de bord Google, autoriser les URL de retour du site, puis définir `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED=true` et redéployer. Ne pas activer cette variable avant un test réel.

## Vercel

Build command : `pnpm build`; output directory : `dist`; installation : `pnpm install --frozen-lockfile`. La règle `vercel.json` renvoie les routes de l’application monopage vers `index.html`. Ajouter les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans l’environnement de déploiement concerné; ajouter la variable Google uniquement après la configuration OAuth. Aucun déploiement n’est effectué automatiquement par ce projet.

## Données et sécurité dans cette phase

La migration crée les profils, les rôles, les profils étudiants et le référentiel scolaire initial défini dans le cahier des charges. Le référentiel BF est une configuration de classes/séries; il ne certifie aucun programme officiel. RLS est activée sur toutes ces tables; l’inscription publique attribue uniquement `student`. Les rôles parent, enseignant et admin existent comme types de base pour l’extension, mais leurs espaces et permissions métiers sont hors périmètre.

La base Supabase n’était pas reliée pendant l’implémentation. En conséquence, la migration livrée n’est pas annoncée comme appliquée; l’authentification contre un vrai projet doit être vérifiée après les étapes ci-dessus. Les pages de confidentialité et conditions portent un avertissement de brouillon et nécessitent revue juridique et de protection des mineurs avant ouverture publique.
