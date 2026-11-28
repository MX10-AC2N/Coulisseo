# Description du dépôt et réglages GitHub

Tout ce qui se règle dans l'interface de GitHub, et où coller quoi.

---

## 1. Description courte (Settings ▸ General ▸ Description)

> Tableau de bord de l'intermittent du spectacle : suivi du droit, anticipation du réexamen, module
> fiscal (frais réels, ARE, CESU) et dossier imprimable. Annexes 8 et 10 — 100 % local, MIT.

*(211 caractères — la limite GitHub est de 350.)*

## 2. Description longue (profil / page d'accueil / présentation)

> Coulisseo est le tableau de bord de l'intermittent du spectacle (annexes 8 et 10).
>
> Il reprend le moteur de calcul du simulateur de mystéropodes — laissé intact et testé sur les
> exemples chiffrés du guide France Travail — et lui ajoute une interface sombre, un module
> d'anticipation du réexamen, un module fiscal complet et un dossier imprimable A4.
>
> Tout se passe dans le navigateur : aucun compte, aucune donnée envoyée, CSP stricte.

## 3. Topics (Settings ▸ General ▸ Topics)

`intermittent` · `spectacle` · `annexes-8-10` · `francetravail` · `allocation-chomage` ·
`are` · `dashboard` · `fiscalite` · `cesu` · `revenu-fiscal` · `react` · `typescript` ·
`vite` · `tailwindcss` · `pwa` · `privacy`

## 4. Aperçu social (Settings ▸ General ▸ Social preview)

Fichier à téléverser : **`docs/apercu-social.png`** (1280 × 640).

## 5. Pages (Settings ▸ Pages ▸ Source)

Choisir **GitHub Actions**. Le workflow `Déploiement — GitHub Pages` publie ensuite automatiquement à
chaque push sur `main`, sur `https://mx10-ac2n.github.io/Coulisseo/`.

## 6. Actions (Settings ▸ Actions ▸ General)

- *Allow all actions and reusable workflows* : activé (par défaut sur un dépôt public).
- Les workflows de ce dépôt :

| Workflow | Quand | Ce qu'il fait |
|---|---|---|
| `CI — tests, typage et build` | chaque push, chaque PR | typage TypeScript strict, 111 tests, build sur Node 20 et 22, dépose le site en artefact |
| `Déploiement — GitHub Pages` | push sur `main` | construit avec le base `/Coulisseo/`, publie sur GitHub Pages, puis contrôle que le site en ligne répond |
| `Prévisualisation — pull request` | PR ouverte ou mise à jour | construit le site et le dépose en artefact téléchargeable dans l'onglet Actions |
| `Publication — version` | tag `v*` | crée une GitHub Release avec le site en archive |
| `Sécurité — CodeQL` | push sur `main`, le 1er du mois | analyse de sécurité JavaScript/TypeScript |
| `Rappel — vérifier les barèmes` | 2 janvier et 2 juillet | ouvre un ticket pour mettre à jour SMIC, PMSS et AJ minimale |

## 7. Dependabot

`.github/dependabot.yml` : propositions de mise à jour mensuelles pour npm (groupées en
production / développement) et pour les actions GitHub.

## 8. Branches

- `main` : version stable, c'est elle qui est publiée sur GitHub Pages.
- Branches de travail : le test de CI s'y applique automatiquement.
- Les pull requests produces une prévisualisation téléchargeable.

## 9. Publier une version

```bash
npm run check                       # typage + tests + build, comme la CI
npm version minor                   # 2.1.0
git push --follow-tags              # déclenche « Publication — version »
```
