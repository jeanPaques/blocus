# Blocus

Plateforme d'entraînement aux examens par **révision active** : questions ouvertes, auto-évaluation, examens blancs chronométrés et carnet d'erreurs. 100 % dans le navigateur — aucun compte, aucun serveur, vos données restent chez vous.

## Fonctionnalités

- **Sessions indépendantes** (ex. Janvier, Juin), chacune avec ses matières et questions.
- **Révision** d'une session entière ou d'une seule matière, ordre automatique : non vues → ratées → maîtrisées.
- **Examen blanc** : nombre de questions et durée au choix, correction différée, note sur 20, reprise après rechargement.
- **Carnet d'erreurs** centralisé, filtrable par session et matière, imprimable.
- **Jauges de maîtrise** globales, par session et par matière.
- **Import** de questions générées par une IA, **partage** par fichier JSON.
- LaTeX (KaTeX), blocs de code colorés, minuteur Pomodoro, mode sombre, installable (PWA), fonctionne hors ligne.

### Raccourcis clavier (révision)

| Touche | Action |
| --- | --- |
| Espace | Afficher la réponse |
| F / 1 | Raté |
| V / B / 2 | Bon |

## Format d'import

```markdown
### Matière : Physique
### Question
Énoncez la deuxième loi de Newton.
### Réponse
$$\vec F = m\,\vec a$$
```

## Démarrer en local

Prérequis : Node.js 22.

```sh
git clone <url-du-depot>
cd blocus
npm install
npm run dev      # http://localhost:8080
```

| Commande | Rôle |
| --- | --- |
| `npm run build` | Build de production |
| `npm test` | Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Structure

```text
src/
  lib/store.ts        État de l'app (localStorage + 3 points de restauration)
  lib/exam.ts         Logique des examens blancs
  components/app/     Composants métier (Shell, Pomodoro, RichText, …)
  components/ui/      Composants d'interface (shadcn/ui)
  routes/             Pages (routage par fichiers TanStack Router)
```

Stack : TanStack Start, React 19, Vite, Tailwind CSS v4, TypeScript.

## Licence

[MIT](LICENSE)
