# EduFlow — fondations et espaces Phase 2

EduFlow est une application React 19/TypeScript/Vite utilisant un projet **Supabase externe** pour Auth, PostgreSQL/RLS et Storage. Les seules valeurs frontend attendues sont l’URL Supabase et sa clé **publishable/anon** : elles ne donnent aucun privilège à elles seules et ne remplacent pas les politiques RLS. La clé `service_role` ne doit jamais être ajoutée au frontend, à Vercel ou au dépôt.

## Développement

Prérequis : Node.js `>=22.12` et pnpm `11.25.0` (déclaré dans `package.json`).

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Variables client nécessaires :

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
# Facultatif et seulement après test Google OAuth dans Supabase :
VITE_SUPABASE_GOOGLE_OAUTH_ENABLED=false
```

Sans les deux premières valeurs, les pages publiques sont accessibles, mais l’authentification et les espaces protégés affichent un état explicite non configuré. Aucun compte, rôle ou chiffre de démonstration n’est créé. La connexion Google est masquée par défaut.

## Mise en place Supabase — manuelle et prudente

La base Supabase n’était pas configurée dans l’environnement de développement au moment du dernier contrôle. **Aucune migration Phase 1 ou Phase 2 n’est déclarée comme appliquée, et aucune base externe n’a été modifiée par cette implémentation.** Avant de lancer du SQL, le propriétaire doit vérifier que le projet sélectionné est bien l’instance EduFlow cible, consulter les migrations et confirmer l’état de son schéma.

1. Dans le SQL Editor du projet Supabase cible, examiner puis appliquer les migrations versionnées **dans cet ordre**, une seule fois :
   - `supabase/migrations/20261113200000_phase1_foundation.sql`
   - `supabase/migrations/20261114120000_phase2_user_spaces.sql`
2. Ne pas exécuter `db reset`, ne pas supprimer de table/donnée et ne pas désactiver RLS. La deuxième migration est additive et exige le schéma/types Phase 1. Elle active RLS sur les nouvelles tables, ajoute les RPC de rôles/liaisons/revue/admin, et configure le bucket privé `eduflow-teacher-contributions` pour PDF, MP4 et WebM, maximum 50 MiB.
3. Pour le tout premier administrateur uniquement, identifier manuellement le bon utilisateur depuis l’interface Supabase Auth et ajouter son UUID vérifié par l’éditeur SQL de confiance (jamais depuis une page publique). Exemple à adapter après vérification de l’UUID :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where id = '<UUID-vérifié-du-propriétaire>'
on conflict (user_id, role) do nothing;
```

4. Définir les variables client `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans les paramètres WebDev de l’environnement de test, puis redémarrer Preview. Ne pas coller de clé dans un message, fichier versionné ou console navigateur. Ne fournir aucune clé `service_role` à l’application.
5. Dans **Authentication → URL Configuration**, vérifier la redirection vers `/auth/callback` et `/reset-password` pour les origines Preview et production réellement utilisées. Garder la confirmation d’adresse email active; configurer un SMTP maîtrisé avant l’ouverture publique si les limites email par défaut sont insuffisantes.
6. Google reste inactif jusqu’à ce que son fournisseur soit configuré/testé dans Supabase Auth, les callbacks du tableau de bord autorisés et `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED=true` ajouté au bon environnement.

### Règles métier livrées

- Une liaison parent-enfant commence par un code aléatoire à usage unique, stocké seulement sous forme hachée et expirant; l’élève accepte ou refuse la demande. Un parent ne lit que les données d’un enfant disposant d’un lien actif. Cela ne constitue pas une vérification juridique de tutelle.
- Les enseignants peuvent déposer des propositions gratuites. Les fichiers restent dans un bucket privé; seules les contributions en brouillon/rejetées sont modifiables par leur propriétaire; seule l’administration peut faire passer `submitted → in_review → approved/rejected`. Une approbation de proposition ne publie pas automatiquement un cours aux élèves.
- Les rapports parentaux affichent seulement les événements EduFlow réellement présents pour les périodes « 7 derniers jours » ou « mois en cours ». Les événements in-app respectent la préférence du compte. Les rapports sont consultés à la demande : aucun email, push ou traitement planifié n’est configuré.
- Le premier rôle admin ne peut pas être demandé publiquement; les demandes parent/enseignant requièrent une approbation. Le client ne peut pas modifier les rôles privilégiés, les décisions de revue ni les journaux admin.
- Les parcours étudiants existants restent présents; les moteurs complets de cours/chapitres/leçons, exercices/examens élèves, EduAI, paiement et abonnement restent hors de Phase 2.

## Vercel

- Build : `pnpm build`
- Dossier publié : `dist`
- Installation : `pnpm install --frozen-lockfile`
- `vercel.json` redirige les routes de l’application monopage vers `index.html`.

Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans Project Settings → Environment Variables, uniquement aux environnements voulus. Ajouter la variable Google après test réel seulement, vérifier les URL de redirection Supabase et redéployer manuellement. **Aucun déploiement public n’a été déclenché.**

Les pages de confidentialité et conditions demeurent des brouillons nécessitant une revue juridique et de protection des mineurs avant ouverture publique.
