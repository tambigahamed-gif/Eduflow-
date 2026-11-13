# EduFlow — Suivi Phase 1

Les critères ci-dessous proviennent de la demande utilisateur validée. Une case n’est cochée qu’une fois le comportement réellement livré et vérifié. Périmètre strict : Phase 1; arrêter et demander la validation avant toute Phase 2.

## Identité visuelle et site public — livré

- [x] « Mets en place l'identité visuelle EduFlow et une interface professionnelle, moderne et responsive, avec priorité aux smartphones. » Utiliser le logo fourni, les couleurs et principes du cahier des charges; veiller à la cohérence mobile, tablette et ordinateur. **Vérifié visuellement aux formats smartphone, tablette et ordinateur.**
- [x] « Développe la page d'accueil publique complète. » Inclure les sections d’accueil prévues au cahier (présentation, fonctionnalités de la plateforme, EduAI présenté comme vision sans prétendre qu’il est actif, cours, niveaux scolaires, espace parents, enseignants, avantages, tarifs proposés configurables à l’avenir, FAQ, appel à inscription et pied de page), avec navigation et routes publiques utiles; signaler clairement toute fonctionnalité non disponible en Phase 1. **Les blocs tarifs indicatifs et FAQ ont été ajoutés à l’accueil; les prix et services non actifs sont explicitement signalés.**
- [x] « L'expérience doit être simple, fluide, professionnelle et adaptée à une plateforme éducative internationale. » L’identité ne contient ni drapeau, ni carte nationale, ni nom de pays comme identité de marque.

## Authentification, profil et rôles — code livré; test live en attente de Supabase

- [ ] « Implémente l'authentification Supabase : Inscription. Connexion. Déconnexion. Connexion Google si la configuration le permet. Mot de passe oublié et réinitialisation. Vérification de l'adresse email. » Tester les parcours réellement configurables; ne pas afficher Google comme opérationnel sans configuration fournisseur, URL de retour et test. **Le client et les parcours sont écrits; les variables Supabase étant absentes, aucune authentification réelle ni aucun test de bout en bout n’a été exécuté. Google reste masqué par défaut et nécessite configuration/test avant activation.**
- [ ] « Mets en place les profils utilisateurs et une attribution sécurisée des rôles. Aucun utilisateur ne doit pouvoir devenir administrateur depuis l'inscription publique. » Ne pas permettre l’auto-attribution d’un rôle privilégié; les autorisations sont contrôlées côté serveur/base et dans les policies, pas seulement par l’interface. Éviter toute exposition de secret au frontend. **Le trigger et les grants/RLS sont livrés dans la migration et ont été audités statiquement; le test sur instance Supabase attend l’application de la migration.**

## Onboarding et tableau de bord étudiant — code livré; test live en attente de Supabase

- [ ] « Développe l'onboarding étudiant avec le niveau, la classe, la série si applicable et les informations nécessaires. » Utiliser une taxonomie configurable; les séries ne s’appliquent qu’aux classes concernées. Ne présenter aucun programme comme officiel sans validation par une source officielle. **Le formulaire et le référentiel sont implémentés; vérification avec un compte étudiant réel bloquée tant que Supabase n’est pas relié.**
- [ ] « Crée le premier tableau de bord étudiant avec une interface fonctionnelle et des états vides honnêtes. » Les contenus, activités, résultats ou statistiques inexistants restent explicitement vides et ne sont pas simulés. **Le dashboard est implémenté et ses états vides sont visuellement vérifiés; les requêtes réelles et la garde de session nécessitent Supabase.**

## Supabase, migrations et RLS — migration versionnée livrée, non appliquée

- [ ] « Configure Supabase proprement : migrations versionnées, contraintes, permissions et politiques RLS adaptées. » Activer RLS sur les tables contenant des données privées; permettre à un étudiant l’accès à ses propres données seulement; préparer des rôles parent/enseignant/admin sans leurs fonctionnalités Phase 2; les rôles privilégiés sont attribués par procédure sécurisée. **La migration additive et ses policies sont livrées, puis vérifiées statiquement; aucune base Supabase n’était connectée et la migration n’a pas été exécutée.**
- [x] Ne supprimer aucune donnée existante; ne jamais désactiver RLS pour contourner une erreur; ne placer aucun secret dans le frontend. Ne pas inscrire de valeur secrète dans le dépôt. **Aucune donnée externe n’a été modifiée; le contrôle des sources n’a trouvé aucune clé service/provider.**

## Préparation de l’architecture pour la suite — livré

- [x] « Prépare l'architecture pour les futurs espaces parent, enseignant et administration sans développer leurs fonctionnalités maintenant. » Prévoir séparation de modules, typage et conventions extensibles. Ne pas passer à la Phase 2.
- [x] Ne développer que la Phase 1. Ne pas développer les fonctionnalités des phases ultérieures telles que liaison parent-enfant, soumissions enseignant, gestion admin, contenus pédagogiques complets, exercices, examens, assistant IA, abonnements/paiements, notification métier, PWA ou applications natives. **Aucun de ces modules n’est livré comme opérationnel.**

## Qualité et rapport de fin de phase — rapport livré; tests externes bloqués

- [ ] « Vérifie le fonctionnement réel des formulaires, boutons, routes et permissions. » « Effectue les tests nécessaires : build, TypeScript, lint, authentification, navigation, responsive et sécurité des permissions. » Rapporter distinctement les tests réussis, échoués, bloqués par une configuration externe et non exécutés; ne pas prétendre à des tests Auth contre Supabase sans service configuré. **Build, TypeScript, lint, tests locaux, routes/manifeste, captures responsives et quelques interactions front sont vérifiés. Auth, RLS et les permissions runtime ne sont pas testables avant configuration Supabase.**
- [x] « Ne crée pas de fausses fonctionnalités ou de fausses statistiques. » « Ne prétends pas qu'une intégration est opérationnelle si elle n'a pas été testée. »
- [x] À la fin, fournir un rapport précis indiquant « Ce qui a été développé; Les fichiers créés ou modifiés; Les migrations exécutées; Les tables et politiques RLS; Les fonctionnalités réellement opérationnelles; Les tests réussis et échoués; Les variables d'environnement nécessaires; Les éventuelles configurations que je dois effectuer manuellement sur Supabase ou Vercel. » Distinguer les migrations livrées des migrations réellement appliquées.
- [x] Préserver le projet et arrêter à la fin de Phase 1 pour attendre la validation de l’utilisateur. Ne pas déployer publiquement sans demande distincte.
