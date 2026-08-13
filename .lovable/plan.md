# Plan : structure pédagogique modifiable depuis l’espace enseignant

## Objectif
Permettre à l’enseignant de créer / modifier sans toucher au code :
- les activités EPS
- les compétences de chaque activité
- les 5 niveaux de chaque compétence + leur description
- les objectifs
- les critères d’évaluation

L’élève voit ensuite automatiquement les activités et compétences qui lui sont attribuées.
Le design général du site reste inchangé.

## 1. Schéma de données (Lovable Cloud / PostgreSQL)

Tables à créer :

- `profiles` — utilisateurs (élève ou enseignant), liés à `auth.users`.
- `classes` — classes créées par un enseignant.
- `class_students` — liaison classes / élèves.
- `activities` — activités EPS créées par un enseignant.
- `competencies` — compétences rattachées à une activité.
- `competency_levels` — 5 niveaux par compétence avec description.
- `objectives` — objectifs rattachés à une activité.
- `evaluation_criteria` — critères d’évaluation rattachés à un objectif.
- `student_activities` — activités attribuées à un élève.
- `evaluations` — niveau atteint par un élève sur une compétence.
- `achievements` — réussites / badges débloqués.

Chaque table aura :
- `GRANT` appropriés
- RLS activé
- policies pour enseignants (lecture/écriture sur leurs données) et élèves (lecture de leurs données)

## 2. Authentification et rôles

- Rôles stockés dans une table `user_roles` (jamais sur `profiles`).
- Fonction `has_role` en SECURITY DEFINER.
- Deux rôles : `teacher`, `student`.
- L’interface enseignant sera protégée par rôle.

## 3. Server functions

Fichiers `.functions.ts` côté client-safe :

- `activities.functions.ts` : lister, créer, modifier, supprimer une activité.
- `competencies.functions.ts` : CRUD compétences + niveaux.
- `objectives.functions.ts` : CRUD objectifs + critères.
- `student.functions.ts` : activités/compétences évaluées pour l’élève connecté.
- `teacher.functions.ts` : classes, élèves, attributions.

Toutes les fonctions d’écriture utilisent `.middleware([requireSupabaseAuth])` et vérifient le rôle `teacher`.

## 4. Espace enseignant (UI)

- `prof/activites` : liste des activités + bouton créer.
- `prof/activites/$id` : détail d’une activité avec ses compétences.
- `prof/competences/$id` : édition des 5 niveaux d’une compétence.
- `prof/objectifs` : liste et édition des objectifs / critères.
- `prof/classes` : gestion des classes et attribution des activités aux élèves.

Formulaires simples, sans tableur : cartes, champs empilés, boutons d’action.

## 5. Espace élève (UI)

- Adapter `eleve/profil`, `eleve/activites`, `eleve/objectifs`, `eleve/reussites` pour lire depuis la base.
- Conserver le design mobile-first sportif existant.

## 6. Données de démonstration

- Insérer un enseignant, une classe, un élève, et l’exemple Badminton avec 2 compétences et 5 niveaux via une migration d’insertion.

## Livrables

- Migrations SQL validées
- Server functions typées
- Pages enseignant CRUD
- Pages élève connectées à la base
- Seed de démo fonctionnel

## Durée estimée

Implémentation en plusieurs étapes : schéma → server functions → UI enseignant → UI élève → seed.
