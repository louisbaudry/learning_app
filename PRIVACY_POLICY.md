# Politique de confidentialité (brouillon)

**Statut : BROUILLON — non publié.** Ce texte concrétise les décisions prises
dans `SPECIFICATIONS.md` §11 (Décision 12) et `DATABASE_SCHEMA.md` sous forme
de politique de confidentialité destinée aux parents. **Il doit être relu par
un professionnel du droit avant toute publication** — ce document n'est pas
un avis juridique, c'est une mise en cohérence entre le schéma de données
réel et ce qu'on promet à l'utilisateur.

Convention de ce dépôt : le contenu destiné aux parents/enfants est rédigé en
français en premier (`CLAUDE.md`). Une version anglaise pourra être ajoutée
en Phase 1 aux côtés de l'UI anglaise.

*Dernière mise à jour : 2026-08-31.*

---

## 1. Qui est responsable du traitement

[Nom du parent / de l'entité éditrice] est responsable du traitement des
données décrites ici, pour l'application [nom de l'app].

*À compléter avant publication : identité légale exacte, adresse, moyen de
contact dédié à la confidentialité (ex. une adresse e-mail).*

## 2. Quelles données sont collectées

| Catégorie | Exemples | Concerne |
|---|---|---|
| Compte parent | nom, e-mail, langue, fuseau horaire | le parent (`profiles`) |
| Profil de l'enfant | prénom, date de naissance, langue, avatar | l'enfant (`students`) |
| Personnalisation | centres d'intérêt et style d'apprentissage écrits librement par le parent (`learner_notes`) | l'enfant, saisi par le parent |
| Préférences d'accessibilité | taille de police, contraste élevé, synthèse vocale (`settings`) | l'enfant |
| Activité pédagogique | réponses aux exercices, tentatives, temps passé, scores (`responses`, `assignments`) | l'enfant |
| Appareil lié | nom de l'appareil, dernière connexion (`student_devices`) | l'enfant |
| Contenu généré par IA | invites envoyées à l'API Claude et réponses reçues (`ai_generations`) | l'enfant (indirectement, via les paramètres de génération) |

**Ce que nous ne collectons délibérément pas :** aucune donnée de diagnostic
ou médicale (type de handicap, etc.). C'est une décision de conception
documentée dans `DATABASE_SCHEMA.md` §3.4 — la personnalisation passe par
`learner_notes` (centres d'intérêt, style d'apprentissage) et non par une
étiquette de diagnostic, justement pour éviter de traiter une donnée
sensible au sens de l'article 9 du RGPD sans nécessité fonctionnelle. Merci
de ne pas saisir d'information médicale ou de diagnostic dans les champs
libres (« centres d'intérêt de l'enfant », instructions supplémentaires) —
ce ne sont pas des champs prévus ni protégés pour ce type de donnée.

## 3. Pourquoi (finalités) et sur quelle base légale

- **Fournir le service** (créer et suivre les leçons de l'enfant) — base
  légale : exécution du contrat conclu avec le parent qui crée le compte
  familial.
- **Personnaliser le contenu** (via `learner_notes`, la génération IA) —
  base légale : intérêt légitime du parent à obtenir un contenu pertinent
  pour son enfant, avec un contrôle total du parent sur ce champ (lecture,
  modification, suppression à tout moment).
- **Sécurité du compte enfant** (code de liaison à usage unique, PIN
  optionnel) — base légale : intérêt légitime (protection de l'accès au
  compte de l'enfant).

**Ce que nous ne faisons pas :** l'enfant ne crée jamais lui-même de compte
et ne donne jamais lui-même son consentement à un service — voir §5. Il n'y a
donc pas de mécanisme de consentement de l'enfant au sens de l'article 8 du
RGPD à mettre en œuvre ici : la relation contractuelle est entre le parent et
le service.

## 4. Qui reçoit ces données (sous-traitants)

| Sous-traitant | Rôle | Données concernées |
|---|---|---|
| **Supabase** | Hébergement de la base de données, authentification, fonctions serveur | Toutes les données ci-dessus |
| **Anthropic (API Claude)** | Génération de leçons à partir des paramètres saisis par le parent | Le sujet, la difficulté, `learner_notes`, les instructions du parent — jamais l'identité complète de l'enfant |

Aucune de ces données n'est vendue ni utilisée à des fins publicitaires.
*À finaliser avant publication : région d'hébergement Supabase (recommandé :
UE, pour simplifier l'analyse des transferts internationaux) et activation,
si disponible pour ce compte, de l'option "pas de rétention à des fins
d'entraînement" de l'API Anthropic — voir `AI_CONTENT_GENERATION.md`.*

## 5. Le compte de l'enfant

L'enfant ne crée jamais de compte avec e-mail et mot de passe. Le parent
génère un code de liaison à usage unique, saisi une fois sur le téléphone de
l'enfant (`DATABASE_SCHEMA.md` §3.5–3.6). Le parent peut révoquer l'accès
d'un appareil à tout moment. C'est le parent, en tant que titulaire de
l'autorité parentale et du compte, qui exerce les droits ci-dessous au nom de
l'enfant.

## 6. Combien de temps ces données sont conservées

- Suppression d'une donnée (contenu, élève, compte) : conservation dans un
  état "supprimé" pendant **30 jours** (fenêtre de récupération en cas
  d'erreur), puis suppression définitive automatique.
- Aucune conservation indéfinie : à la clôture du compte familial, toutes
  les données sont définitivement supprimées au plus tard 30 jours après.

## 7. Vos droits

Le parent, pour son propre compte et celui de son ou ses enfants, peut à
tout moment :
- **accéder** à l'ensemble des données (export complet — voir Décision 9,
  prévu au plus tard en Phase 1.5) ;
- **rectifier** toute donnée inexacte (profil, prénom, notes de
  personnalisation) directement dans l'application ;
- **supprimer** un élève, un contenu, ou l'ensemble du compte ;
- **s'opposer** à la personnalisation par IA (ne pas remplir `learner_notes`,
  ou créer le contenu manuellement plutôt que via génération IA) ;
- **exporter** ses données dans un format réutilisable.

*À compléter avant publication : procédure et délai de réponse à une
demande, coordonnées de contact, et — si applicable en France — mention du
droit de réclamation auprès de la CNIL.*

## 8. Sécurité

- Chiffrement des données en transit (HTTPS) et au repos (chiffrement natif
  Supabase).
- Isolation stricte des données par famille via Row Level Security
  PostgreSQL : un parent n'accède qu'aux données de sa propre famille ;
  l'appareil d'un enfant n'accède qu'aux données de cet enfant.
- Aucune information permettant de déterminer si une réponse est correcte
  n'est jamais exposée côté client avant validation côté serveur
  (`submit_answer`, `DATABASE_SCHEMA.md` §4).

---

## Ce qui reste à faire avant publication

1. Faire relire ce texte par un professionnel du droit.
2. Compléter les sections marquées *à compléter*.
3. Confirmer la région d'hébergement Supabase et les paramètres de
   rétention de l'API Anthropic.
4. Ajouter un lien vers ce document dans le flux d'inscription du parent,
   et faire correspondre son acceptation à `profiles.terms_accepted_at`
   (`DATABASE_SCHEMA.md`).
5. Version anglaise, alignée sur la Phase 1 (UI anglaise).
